import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth.contract";
import {
  PrismaCrmClientParticipantRepository,
  crm_client_participant_role_types,
  type CrmClientParticipantCreateInput,
  type CrmClientParticipantAccessScope,
  type CrmClientParticipantListFilters
} from "./client-participants.repository";
import {
  PrismaCrmClientRepository,
  type CrmClientAccessScope,
  type CrmClientCreateInput,
  type CrmClientMergeInput,
  type CrmClientUpdateInput
} from "./clients.repository";
import {
  PrismaCrmContactRepository,
  type CrmContactAccessScope,
  type CrmContactCreateInput,
  type CrmContactListFilters
} from "./contacts.repository";
import { PrismaCrmDealRepository } from "../transactional/crm/deal.repository";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";

export interface MergeClientPayload {
  sourceClientId: string;
  targetClientId: string;
  reason?: string | null;
}

@Injectable()
export class CrmRelationsService {
  constructor(
    @Inject(PrismaCrmClientRepository)
    private readonly clientRepository: PrismaCrmClientRepository,
    @Inject(PrismaCrmContactRepository)
    private readonly contactRepository: PrismaCrmContactRepository,
    @Inject(PrismaCrmClientParticipantRepository)
    private readonly clientParticipantRepository: PrismaCrmClientParticipantRepository,
    @Inject(PrismaCrmDealRepository)
    private readonly dealRepository: PrismaCrmDealRepository
  ) {}

  async listClients(query: ReadCollectionQueryInput, actor: AuthPrincipal) {
    const scope = resolve_crm_access_scope(actor);
    return this.clientRepository.list(query, scope);
  }

  async getClient(clientId: string, actor: AuthPrincipal) {
    const scope = resolve_crm_access_scope(actor);
    const client = await this.clientRepository.findById(clientId, scope);
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' was not found`);
    }

    return client;
  }

  async createClient(input: CrmClientCreateInput, actor: AuthPrincipal) {
    this.assert_crm_write_access(actor);

    return this.clientRepository.create({
      clientType: input.clientType.trim(),
      name: input.name.trim(),
      ...(input.legalName !== undefined ? { legalName: input.legalName?.trim() ?? null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() ?? null } : {}),
      ...(input.taxId !== undefined ? { taxId: input.taxId?.trim() ?? null } : {}),
      ...(input.addressText !== undefined
        ? { addressText: normalize_optional_text(input.addressText) }
        : {}),
      ...(input.addressComment !== undefined
        ? { addressComment: normalize_optional_text(input.addressComment) }
        : {}),
      ...(input.installerReferralComment !== undefined
        ? { installerReferralComment: normalize_optional_text(input.installerReferralComment) }
        : {}),
      ...(input.designerReferralComment !== undefined
        ? { designerReferralComment: normalize_optional_text(input.designerReferralComment) }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  async patchClient(clientId: string, input: CrmClientUpdateInput, actor: AuthPrincipal) {
    this.assert_crm_write_access(actor);
    const scope = resolve_crm_access_scope(actor);
    const updateInput: CrmClientUpdateInput = {
      ...(input.clientType !== undefined ? { clientType: input.clientType.trim() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.legalName !== undefined ? { legalName: normalize_optional_text(input.legalName) } : {}),
      ...(input.phone !== undefined ? { phone: normalize_optional_text(input.phone) } : {}),
      ...(input.email !== undefined ? { email: normalize_optional_text(input.email) } : {}),
      ...(input.taxId !== undefined ? { taxId: normalize_optional_text(input.taxId) } : {}),
      ...(input.addressText !== undefined ? { addressText: normalize_optional_text(input.addressText) } : {}),
      ...(input.addressComment !== undefined
        ? { addressComment: normalize_optional_text(input.addressComment) }
        : {}),
      ...(input.installerReferralComment !== undefined
        ? { installerReferralComment: normalize_optional_text(input.installerReferralComment) }
        : {}),
      ...(input.designerReferralComment !== undefined
        ? { designerReferralComment: normalize_optional_text(input.designerReferralComment) }
        : {}),
      ...(input.notes !== undefined ? { notes: normalize_optional_text(input.notes) } : {})
    };

    if (Object.keys(updateInput).length === 0) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Client patch payload must include at least one mutable field"
      });
    }

    const updated = await this.clientRepository.updateById(clientId, updateInput, scope);
    if (!updated) {
      throw new NotFoundException(`Client '${clientId}' was not found`);
    }

    return updated;
  }

  async listClientDedupCandidates(query: ReadCollectionQueryInput, actor: AuthPrincipal) {
    const scope = resolve_crm_access_scope(actor);
    return this.clientRepository.listDedupCandidates(query, scope);
  }

  async mergeClient(pathClientId: string, input: MergeClientPayload, actor: AuthPrincipal) {
    this.assert_crm_write_access(actor);
    const sourceClientId = input.sourceClientId.trim();
    const targetClientId = input.targetClientId.trim();

    if (pathClientId !== targetClientId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Client merge path id must match targetClientId"
      });
    }

    if (sourceClientId === targetClientId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Client merge requires distinct sourceClientId and targetClientId"
      });
    }

    const scope = resolve_crm_access_scope(actor);
    await this.assert_client_exists(sourceClientId, scope);
    await this.assert_client_exists(targetClientId, scope);

    const mergeInput: CrmClientMergeInput = {
      sourceClientId,
      targetClientId,
      reason: normalize_optional_text(input.reason),
      actorUserId: actor.userId
    };

    return this.clientRepository.mergeClients(mergeInput);
  }

  async listContacts(
    query: ReadCollectionQueryInput,
    filters: CrmContactListFilters,
    actor: AuthPrincipal
  ) {
    const scope = resolve_crm_access_scope(actor);
    return this.contactRepository.list(query, filters, scope);
  }

  async getContact(contactId: string, actor: AuthPrincipal) {
    const scope = resolve_crm_access_scope(actor);
    const contact = await this.contactRepository.findById(contactId, scope);
    if (!contact) {
      throw new NotFoundException(`Contact '${contactId}' was not found`);
    }

    return contact;
  }

  async createContact(input: CrmContactCreateInput, actor: AuthPrincipal) {
    this.assert_crm_write_access(actor);
    const scope = resolve_crm_access_scope(actor);
    await this.assert_client_exists(input.clientId, scope);

    return this.contactRepository.create({
      clientId: input.clientId,
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() ?? null } : {}),
      ...(input.position !== undefined ? { position: input.position?.trim() ?? null } : {}),
      ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  async listClientParticipants(
    query: ReadCollectionQueryInput,
    filters: CrmClientParticipantListFilters,
    actor: AuthPrincipal
  ) {
    const scope = resolve_crm_access_scope(actor);
    return this.clientParticipantRepository.list(query, filters, scope);
  }

  async getClientParticipant(participantId: string, actor: AuthPrincipal) {
    const scope = resolve_crm_access_scope(actor);
    const participant = await this.clientParticipantRepository.findById(participantId, scope);
    if (!participant) {
      throw new NotFoundException(`ClientParticipant '${participantId}' was not found`);
    }

    return participant;
  }

  async createClientParticipant(input: CrmClientParticipantCreateInput, actor: AuthPrincipal) {
    this.assert_crm_write_access(actor);
    const scope = resolve_crm_access_scope(actor);
    await this.assert_client_exists(input.clientId, scope);

    if (!crm_client_participant_role_types.includes(input.roleType)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "ClientParticipant.roleType must be one of: installer, designer"
      });
    }

    if (input.dealId) {
      const deal = await this.dealRepository.findById(input.dealId);
      if (!deal) {
        throw new NotFoundException(`Deal '${input.dealId}' was not found`);
      }

      if (scope?.responsibleUserId && deal.responsibleUserId !== scope.responsibleUserId) {
        throw new ForbiddenException({
          code: "ACCESS_DENIED",
          message: "Seller can link client participant only to own deal"
        });
      }

      if (deal.clientId !== input.clientId) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "ClientParticipant.dealId must reference deal linked to the same client"
        });
      }
    }

    return this.clientParticipantRepository.create({
      clientId: input.clientId,
      ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
      roleType: input.roleType,
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {})
    });
  }

  private async assert_client_exists(
    clientId: string,
    scope?: CrmClientAccessScope
  ): Promise<void> {
    const client = await this.clientRepository.findById(clientId, scope);
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' was not found`);
    }
  }

  private assert_crm_write_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      ["seller", "admin", "ceo"].includes(roleCode)
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "CRM write access is denied for current role"
      });
    }
  }
}

const privileged_crm_roles = new Set(["admin", "ceo"] as const);

function resolve_crm_access_scope(
  actor: AuthPrincipal
): CrmClientAccessScope & CrmContactAccessScope & CrmClientParticipantAccessScope {
  const isPrivileged = actor.roleCodes.some((roleCode) =>
    privileged_crm_roles.has(roleCode as "admin" | "ceo")
  );

  if (isPrivileged) {
    return {};
  }

  return { responsibleUserId: actor.userId };
}

function normalize_optional_text(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
