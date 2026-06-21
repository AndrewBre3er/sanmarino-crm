import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth.contract";
import { assert_lead_status_transition } from "../transactional/crm/lead.transition.guard";
import {
  PrismaCrmLeadRepository,
  type CrmLeadCreateInput,
  type CrmLeadRecord,
  type CrmLeadUpdateInput
} from "../transactional/crm/lead.repository";
import {
  PrismaCrmDealRepository,
  type CrmDealRecord,
  type EnsureDealFromLeadInput
} from "../transactional/crm/deal.repository";
import { PrismaOrdersOrderRepository } from "../transactional/orders/order.repository";
import type { LeadStatus } from "../transactional/shared/status.contract";
import {
  PrismaCrmLeadReadRepository,
  type CrmLeadReadModel,
  type CrmLeadReadScope
} from "../read-side/crm/lead.read.repository";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";

const privileged_role_codes = new Set(["admin", "ceo"] as const);

export interface CreateLeadPayload {
  source: string;
  clientId?: string;
  contactId?: string;
  title?: string;
  notes?: string;
  responsibleUserId?: string;
}

export interface UpdateLeadStatusPayload {
  status: LeadStatus;
  reason?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    @Inject(PrismaCrmLeadReadRepository)
    private readonly leadReadRepository: PrismaCrmLeadReadRepository,
    @Inject(PrismaCrmLeadRepository)
    private readonly leadRepository: PrismaCrmLeadRepository,
    @Inject(PrismaCrmDealRepository)
    private readonly dealRepository: PrismaCrmDealRepository,
    @Inject(PrismaOrdersOrderRepository)
    private readonly orderRepository: PrismaOrdersOrderRepository
  ) {}

  async listLeads(
    query: ReadCollectionQueryInput,
    requestedResponsibleUserId: string | undefined,
    actor: AuthPrincipal
  ) {
    const scope = this.resolve_read_scope(actor, requestedResponsibleUserId);
    return this.leadReadRepository.list(query, scope);
  }

  async getLead(leadId: string, actor: AuthPrincipal): Promise<CrmLeadReadModel> {
    const lead = await this.leadReadRepository.getById(leadId);
    if (!lead) {
      throw new NotFoundException(`Lead '${leadId}' was not found`);
    }

    this.assert_can_access_lead(actor, lead);
    return lead;
  }

  async createLead(input: CreateLeadPayload, actor: AuthPrincipal): Promise<CrmLeadReadModel> {
    const createInput = this.to_create_input(input, actor);
    const created = await this.leadRepository.create(createInput);
    return map_record_to_read_model(created);
  }

  async updateLeadStatus(
    leadId: string,
    input: UpdateLeadStatusPayload,
    actor: AuthPrincipal
  ): Promise<CrmLeadReadModel> {
    const currentLead = await this.leadRepository.findById(leadId);
    if (!currentLead) {
      throw new NotFoundException(`Lead '${leadId}' was not found`);
    }

    this.assert_can_access_lead(actor, currentLead);

    if (currentLead.status === input.status) {
      if (input.status === "in_processing") {
        await this.ensure_deal_for_lead_in_processing(currentLead);
      }

      return map_record_to_read_model(currentLead);
    }

    this.assert_status_update_rules(currentLead, input);

    if (input.status === "in_processing") {
      await this.ensure_deal_for_lead_in_processing(currentLead);
    }

    const updateInput: CrmLeadUpdateInput = {
      status: input.status,
      ...(should_append_cancel_reason(currentLead.status, input.status) && input.reason
        ? { notes: build_cancel_reason_note(currentLead.notes, input.reason) }
        : {})
    };

    const updated = await this.leadRepository.updateById(leadId, updateInput);
    return map_record_to_read_model(updated);
  }

  private to_create_input(input: CreateLeadPayload, actor: AuthPrincipal): CrmLeadCreateInput {
    const isPrivileged = has_privileged_access(actor);
    if (!isPrivileged) {
      const requestedResponsibleUserId = input.responsibleUserId;
      if (requestedResponsibleUserId && requestedResponsibleUserId !== actor.userId) {
        throw new ForbiddenException({
          code: "ACCESS_DENIED",
          message: "Seller can create leads only for self-assignment"
        });
      }
    }

    return {
      source: input.source.trim(),
      status: "new",
      ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(isPrivileged
        ? input.responsibleUserId !== undefined
          ? { responsibleUserId: input.responsibleUserId }
          : {}
        : { responsibleUserId: actor.userId })
    };
  }

  private resolve_read_scope(
    actor: AuthPrincipal,
    requestedResponsibleUserId: string | undefined
  ): CrmLeadReadScope | undefined {
    if (has_privileged_access(actor)) {
      return requestedResponsibleUserId ? { responsibleUserId: requestedResponsibleUserId } : undefined;
    }

    if (requestedResponsibleUserId && requestedResponsibleUserId !== actor.userId) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Seller can filter leads only by own user id"
      });
    }

    return { responsibleUserId: actor.userId };
  }

  private assert_can_access_lead(
    actor: AuthPrincipal,
    lead: { responsibleUserId?: string | null }
  ): void {
    if (has_privileged_access(actor)) {
      return;
    }

    if (lead.responsibleUserId !== actor.userId) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Lead access is limited to owner for seller role"
      });
    }
  }

  private assert_status_update_rules(currentLead: CrmLeadRecord, input: UpdateLeadStatusPayload): void {
    try {
      assert_lead_status_transition(currentLead.status, input.status);
    } catch (error) {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: error instanceof Error ? error.message : "Lead transition is not allowed"
      });
    }

    if (currentLead.status === "new" && input.status === "cancelled") {
      const reason = normalize_reason(input.reason);
      if (!reason) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Cancellation reason is required for transition new -> cancelled"
        });
      }
    }
  }

  private async ensure_deal_for_lead_in_processing(currentLead: CrmLeadRecord): Promise<void> {
    const input = this.to_ensure_deal_from_lead_input(currentLead);
    const deal = await this.dealRepository.ensureFromLead(input);
    this.assert_deal_can_materialize_order(deal);

    await this.orderRepository.ensureFromDeal({
      dealId: deal.id,
      clientId: deal.clientId,
      ...(deal.deliveryMode !== undefined ? { deliveryMode: deal.deliveryMode } : {}),
      ...(deal.notes !== undefined ? { notes: deal.notes } : {})
    });

    await this.dealRepository.markConvertedToOrder(deal.id);
  }

  private assert_deal_can_materialize_order(deal: CrmDealRecord): void {
    if (deal.status === "cancelled") {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: "Order auto-create is not allowed for cancelled deal state"
      });
    }
  }

  private to_ensure_deal_from_lead_input(currentLead: CrmLeadRecord): EnsureDealFromLeadInput {
    const clientId = currentLead.clientId;
    if (!clientId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Lead requires clientId before transition to in_processing"
      });
    }

    const responsibleUserId = currentLead.responsibleUserId;
    if (!responsibleUserId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Lead requires responsibleUserId before transition to in_processing"
      });
    }

    return {
      leadId: currentLead.id,
      clientId,
      ...(currentLead.contactId !== undefined ? { contactId: currentLead.contactId } : {}),
      responsibleUserId,
      title: resolve_deal_title(currentLead),
      ...(currentLead.notes !== undefined ? { notes: currentLead.notes } : {})
    };
  }
}

function has_privileged_access(actor: AuthPrincipal): boolean {
  return actor.roleCodes.some((roleCode) => privileged_role_codes.has(roleCode as "admin" | "ceo"));
}

function map_record_to_read_model(record: CrmLeadRecord): CrmLeadReadModel {
  return {
    id: record.id,
    source: record.source,
    status: record.status,
    clientId: record.clientId ?? null,
    contactId: record.contactId ?? null,
    title: record.title ?? null,
    notes: record.notes ?? null,
    responsibleUserId: record.responsibleUserId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version ?? 1
  };
}

function normalize_reason(reason: string | undefined): string | undefined {
  if (typeof reason !== "string") {
    return undefined;
  }

  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function should_append_cancel_reason(currentStatus: LeadStatus, targetStatus: LeadStatus): boolean {
  return currentStatus === "new" && targetStatus === "cancelled";
}

function build_cancel_reason_note(existingNotes: string | null | undefined, reason: string): string {
  const normalizedReason = reason.trim();
  const reasonLine = `[cancelled_reason] ${normalizedReason}`;

  if (!existingNotes || existingNotes.trim().length === 0) {
    return reasonLine;
  }

  return `${existingNotes}\n${reasonLine}`;
}

function resolve_deal_title(currentLead: CrmLeadRecord): string {
  const normalizedTitle = currentLead.title?.trim();
  if (normalizedTitle && normalizedTitle.length > 0) {
    return normalizedTitle;
  }

  return `Lead ${currentLead.id}`;
}
