import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { PrismaService } from "../../prisma/prisma.service";

export interface SetDealFollowUpPayload {
  nextContactAt: string;
  reminderAt?: string | null;
  comment?: string | null;
}

export interface LogDealCommunicationPayload {
  channel: string;
  direction: string;
  summary: string;
  occurredAt: string;
}

export interface MarkDealLostPayload {
  lostReason: string;
}

export interface MarkDealStuckPayload {
  reason: string;
}

export interface DealFollowUpReadModel {
  id: string;
  dealId: string;
  ownerUserId: string;
  nextContactAt: string;
  reminderAt: string | null;
  status: string;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealCommunicationReadModel {
  id: string;
  dealId: string;
  clientId: string;
  channel: string;
  direction: string;
  summary: string;
  occurredAt: string;
  authorUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DealLostReadModel {
  dealId: string;
  lostReason: string;
  updatedAt: string;
}

export interface DealStuckReadModel {
  dealId: string;
  isStuck: boolean;
  stuckReason: string;
  updatedAt: string;
}

type TransactionClient = Prisma.TransactionClient;

interface DealAccessRecord {
  id: string;
  clientId: string;
  responsibleUserId: string;
}

@Injectable()
export class CrmProductivityService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async setDealFollowUp(
    dealId: string,
    input: SetDealFollowUpPayload,
    actor: AuthPrincipal
  ): Promise<DealFollowUpReadModel> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const nextContactAt = parse_iso_datetime(input.nextContactAt, "nextContactAt");
      const reminderAt =
        input.reminderAt === undefined || input.reminderAt === null
          ? null
          : parse_iso_datetime(input.reminderAt, "reminderAt");
      const comment = normalize_optional_text(input.comment);

      const updatedDeal = await transactionClient.crmDeal.update({
        where: { id: deal.id },
        data: {
          nextContactAt
        },
        select: {
          updatedAt: true
        }
      });

      const followUp = await transactionClient.crmDealFollowUp.create({
        data: {
          dealId: deal.id,
          ownerUserId: actor.userId,
          nextContactAt,
          reminderAt,
          status: "open",
          comment
        }
      });

      await this.emit_deal_event(transactionClient, "deal.follow_up_updated", deal.id, {
        dealId: deal.id,
        nextContactAt: nextContactAt.toISOString(),
        reminderAt: reminderAt?.toISOString() ?? null,
        updatedAt: updatedDeal.updatedAt.toISOString()
      });
      await this.write_audit(transactionClient, "crm.deal.follow_up.set", deal.id, actor, {
        nextContactAt: nextContactAt.toISOString(),
        reminderAt: reminderAt?.toISOString() ?? null
      });

      return map_follow_up_record(followUp);
    });
  }

  async listDealFollowUps(
    dealId: string,
    actor: AuthPrincipal
  ): Promise<DealFollowUpReadModel[]> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const followUps = await transactionClient.crmDealFollowUp.findMany({
        where: { dealId: deal.id },
        orderBy: { createdAt: "desc" }
      });

      return followUps.map(map_follow_up_record);
    });
  }

  async logDealCommunication(
    dealId: string,
    input: LogDealCommunicationPayload,
    actor: AuthPrincipal
  ): Promise<DealCommunicationReadModel> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const occurredAt = parse_iso_datetime(input.occurredAt, "occurredAt");
      const channel = normalize_required_text(input.channel, "channel", 32);
      const direction = normalize_direction(input.direction);
      const summary = normalize_required_text(input.summary, "summary", 5000);

      const communication = await transactionClient.crmDealCommunication.create({
        data: {
          dealId: deal.id,
          clientId: deal.clientId,
          channel,
          direction,
          summary,
          occurredAt,
          authorUserId: actor.userId
        }
      });

      await this.emit_deal_event(transactionClient, "deal.communication_logged", deal.id, {
        dealId: deal.id,
        clientId: deal.clientId,
        channel,
        occurredAt: occurredAt.toISOString(),
        authorUserId: actor.userId
      });
      await this.write_audit(transactionClient, "crm.deal.communication.log", deal.id, actor, {
        clientId: deal.clientId,
        channel,
        direction,
        occurredAt: occurredAt.toISOString()
      });

      return map_communication_record(communication);
    });
  }

  async listDealCommunications(
    dealId: string,
    actor: AuthPrincipal
  ): Promise<DealCommunicationReadModel[]> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const communications = await transactionClient.crmDealCommunication.findMany({
        where: { dealId: deal.id },
        orderBy: { occurredAt: "desc" }
      });

      return communications.map(map_communication_record);
    });
  }

  async markDealLost(
    dealId: string,
    input: MarkDealLostPayload,
    actor: AuthPrincipal
  ): Promise<DealLostReadModel> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const lostReason = normalize_required_code(input.lostReason, "lostReason");
      const updated = await transactionClient.crmDeal.update({
        where: { id: deal.id },
        data: {
          lostReasonCode: lostReason
        },
        select: {
          id: true,
          lostReasonCode: true,
          updatedAt: true
        }
      });

      await this.emit_deal_event(transactionClient, "deal.lost_reason_set", deal.id, {
        dealId: deal.id,
        lostReason,
        changedAt: updated.updatedAt.toISOString()
      });
      await this.write_audit(transactionClient, "crm.deal.lost_reason.set", deal.id, actor, {
        lostReason
      });

      return {
        dealId: updated.id,
        lostReason: updated.lostReasonCode ?? lostReason,
        updatedAt: updated.updatedAt.toISOString()
      };
    });
  }

  async markDealStuck(
    dealId: string,
    input: MarkDealStuckPayload,
    actor: AuthPrincipal
  ): Promise<DealStuckReadModel> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deal = await this.get_deal_for_actor(transactionClient, dealId, actor);
      const stuckReason = normalize_required_code(input.reason, "reason");
      const updated = await transactionClient.crmDeal.update({
        where: { id: deal.id },
        data: {
          isStuck: true,
          stuckReasonCode: stuckReason
        },
        select: {
          id: true,
          isStuck: true,
          stuckReasonCode: true,
          updatedAt: true
        }
      });

      await this.emit_deal_event(transactionClient, "deal.stuck_flag_changed", deal.id, {
        dealId: deal.id,
        isStuck: true,
        reason: stuckReason,
        changedAt: updated.updatedAt.toISOString()
      });
      await this.write_audit(transactionClient, "crm.deal.stuck.mark", deal.id, actor, {
        reason: stuckReason
      });

      return {
        dealId: updated.id,
        isStuck: updated.isStuck,
        stuckReason: updated.stuckReasonCode ?? stuckReason,
        updatedAt: updated.updatedAt.toISOString()
      };
    });
  }

  private async get_deal_for_actor(
    transactionClient: TransactionClient,
    dealId: string,
    actor: AuthPrincipal
  ): Promise<DealAccessRecord> {
    const isPrivileged = actor.roleCodes.includes("admin") || actor.roleCodes.includes("ceo");
    const deal = await transactionClient.crmDeal.findFirst({
      where: {
        id: dealId,
        isDeleted: false,
        ...(isPrivileged ? {} : { responsibleUserId: actor.userId })
      },
      select: {
        id: true,
        clientId: true,
        responsibleUserId: true
      }
    });

    if (!deal) {
      if (isPrivileged) {
        throw new NotFoundException(`Deal '${dealId}' was not found`);
      }

      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Seller can access productivity commands only for own deals"
      });
    }

    return deal;
  }

  private async emit_deal_event(
    transactionClient: TransactionClient,
    eventType: string,
    dealId: string,
    payload: Prisma.InputJsonValue
  ): Promise<void> {
    await transactionClient.systemOutboxRecord.create({
      data: {
        eventType,
        aggregateType: "crm.deal",
        aggregateId: dealId,
        payload
      }
    });
  }

  private async write_audit(
    transactionClient: TransactionClient,
    action: string,
    dealId: string,
    actor: AuthPrincipal,
    payload: Prisma.InputJsonValue
  ): Promise<void> {
    await transactionClient.auditLogRecord.create({
      data: {
        eventId: `crm_${randomUUID()}`,
        occurredAt: new Date(),
        action,
        entityType: "crm.deal",
        entityId: dealId,
        actorUserId: actor.userId,
        payload
      }
    });
  }
}

function map_follow_up_record(record: {
  id: string;
  dealId: string;
  ownerUserId: string;
  nextContactAt: Date;
  reminderAt: Date | null;
  status: string;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DealFollowUpReadModel {
  return {
    id: record.id,
    dealId: record.dealId,
    ownerUserId: record.ownerUserId,
    nextContactAt: record.nextContactAt.toISOString(),
    reminderAt: record.reminderAt?.toISOString() ?? null,
    status: record.status,
    comment: record.comment,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function map_communication_record(record: {
  id: string;
  dealId: string;
  clientId: string;
  channel: string;
  direction: string;
  summary: string;
  occurredAt: Date;
  authorUserId: string;
  createdAt: Date;
  updatedAt: Date;
}): DealCommunicationReadModel {
  return {
    id: record.id,
    dealId: record.dealId,
    clientId: record.clientId,
    channel: record.channel,
    direction: record.direction,
    summary: record.summary,
    occurredAt: record.occurredAt.toISOString(),
    authorUserId: record.authorUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function parse_iso_datetime(value: string, fieldName: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${fieldName} must be a valid ISO date-time`
    });
  }

  return parsed;
}

function normalize_optional_text(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_required_text(value: string, fieldName: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${fieldName} must be a non-empty string up to ${maxLength} characters`
    });
  }

  return normalized;
}

function normalize_required_code(value: string, fieldName: string): string {
  return normalize_required_text(value, fieldName, 64);
}

function normalize_direction(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized !== "inbound" && normalized !== "outbound") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "direction must be inbound or outbound"
    });
  }

  return normalized;
}
