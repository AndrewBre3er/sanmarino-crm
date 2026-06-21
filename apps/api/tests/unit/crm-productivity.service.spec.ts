import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal, AuthRoleCode } from "../../src/modules/auth/auth.contract";
import { CrmProductivityService } from "../../src/modules/crm-productivity/crm-productivity.service";

function make_user(roleCodes: AuthRoleCode[], userId = "seller_1"): AuthPrincipal {
  const primaryRole = roleCodes[0] ?? "seller";
  return {
    userId,
    email: `${userId}@local`,
    login: `${userId}@local`,
    displayName: userId,
    primaryRole,
    roleCodes,
    allowedWorkspaces: roleCodes,
    permissionCodes: [],
    roleCode: primaryRole,
    optionalRole: false
  };
}

function make_deal(overrides: Record<string, unknown> = {}) {
  return {
    id: "deal_1",
    clientId: "client_1",
    responsibleUserId: "seller_1",
    isDeleted: false,
    nextContactAt: null,
    lostReasonCode: null,
    stuckReasonCode: null,
    isStuck: false,
    updatedAt: new Date("2026-04-10T10:00:00.000Z"),
    ...overrides
  };
}

function make_service() {
  const transactionClient = {
    crmDeal: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    crmDealFollowUp: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    crmDealCommunication: {
      create: vi.fn(),
      findMany: vi.fn()
    },
    systemOutboxRecord: {
      create: vi.fn()
    },
    auditLogRecord: {
      create: vi.fn()
    }
  };
  const prismaService = {
    $transaction: vi.fn(async (callback: (client: typeof transactionClient) => unknown) =>
      callback(transactionClient)
    )
  };

  return {
    service: new CrmProductivityService(prismaService as never),
    transactionClient
  };
}

describe("crm productivity service", () => {
  it("sets follow-up, updates deal next contact, and emits outbox event", async () => {
    const { service, transactionClient } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const nextContactAt = "2026-04-11T09:00:00.000Z";
    const reminderAt = "2026-04-11T08:30:00.000Z";

    vi.mocked(transactionClient.crmDeal.findFirst).mockResolvedValue(make_deal());
    vi.mocked(transactionClient.crmDeal.update).mockResolvedValue(
      make_deal({ nextContactAt: new Date(nextContactAt) })
    );
    vi.mocked(transactionClient.crmDealFollowUp.create).mockResolvedValue({
      id: "follow_up_1",
      dealId: "deal_1",
      ownerUserId: "seller_1",
      nextContactAt: new Date(nextContactAt),
      reminderAt: new Date(reminderAt),
      status: "open",
      comment: "Call back",
      createdAt: new Date("2026-04-10T10:00:00.000Z"),
      updatedAt: new Date("2026-04-10T10:00:00.000Z")
    });

    const result = await service.setDealFollowUp(
      "deal_1",
      { nextContactAt, reminderAt, comment: " Call back " },
      seller
    );

    expect(transactionClient.crmDeal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "deal_1",
          isDeleted: false,
          responsibleUserId: "seller_1"
        })
      })
    );
    expect(transactionClient.crmDeal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextContactAt: new Date(nextContactAt)
        })
      })
    );
    expect(transactionClient.crmDealFollowUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal_1",
          ownerUserId: "seller_1",
          comment: "Call back"
        })
      })
    );
    expect(transactionClient.systemOutboxRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "deal.follow_up_updated"
        })
      })
    );
    expect(result.nextContactAt).toBe(nextContactAt);
  });

  it("logs deal communication with client linkage from deal", async () => {
    const { service, transactionClient } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const occurredAt = "2026-04-12T12:00:00.000Z";

    vi.mocked(transactionClient.crmDeal.findFirst).mockResolvedValue(make_deal());
    vi.mocked(transactionClient.crmDealCommunication.create).mockResolvedValue({
      id: "communication_1",
      dealId: "deal_1",
      clientId: "client_1",
      channel: "phone",
      direction: "outbound",
      summary: "Discussed materials",
      occurredAt: new Date(occurredAt),
      authorUserId: "seller_1",
      createdAt: new Date("2026-04-12T12:01:00.000Z"),
      updatedAt: new Date("2026-04-12T12:01:00.000Z")
    });

    const result = await service.logDealCommunication(
      "deal_1",
      {
        channel: " phone ",
        direction: "outbound",
        summary: " Discussed materials ",
        occurredAt
      },
      seller
    );

    expect(transactionClient.crmDealCommunication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal_1",
          clientId: "client_1",
          authorUserId: "seller_1"
        })
      })
    );
    expect(transactionClient.systemOutboxRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "deal.communication_logged"
        })
      })
    );
    expect(result.summary).toBe("Discussed materials");
  });

  it("marks deal lost and stuck without inventing a new deal status", async () => {
    const { service, transactionClient } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(transactionClient.crmDeal.findFirst).mockResolvedValue(make_deal());
    vi.mocked(transactionClient.crmDeal.update)
      .mockResolvedValueOnce(
        make_deal({
          lostReasonCode: "price_too_high",
          updatedAt: new Date("2026-04-13T10:00:00.000Z")
        })
      )
      .mockResolvedValueOnce(
        make_deal({
          isStuck: true,
          stuckReasonCode: "waiting_supplier",
          updatedAt: new Date("2026-04-13T11:00:00.000Z")
        })
      );

    const lost = await service.markDealLost(
      "deal_1",
      { lostReason: " price_too_high " },
      seller
    );
    const stuck = await service.markDealStuck(
      "deal_1",
      { reason: " waiting_supplier " },
      seller
    );

    expect(lost.lostReason).toBe("price_too_high");
    expect(stuck.isStuck).toBe(true);
    expect(stuck.stuckReason).toBe("waiting_supplier");
    expect(transactionClient.crmDeal.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.not.objectContaining({
          status: expect.anything()
        })
      })
    );
  });

  it("blocks seller productivity commands for foreign deals", async () => {
    const { service, transactionClient } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(transactionClient.crmDeal.findFirst).mockResolvedValue(null);

    await expect(
      service.setDealFollowUp(
        "deal_foreign",
        { nextContactAt: "2026-04-11T09:00:00.000Z" },
        seller
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
