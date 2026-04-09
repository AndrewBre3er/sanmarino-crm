import { describe, expect, it, vi } from "vitest";
import { PrismaCrmDealRepository } from "../../src/modules/transactional/crm/deal.repository";

function build_prisma_deal() {
  return {
    id: "deal_1",
    leadId: "lead_1",
    clientId: "client_1",
    contactId: "contact_1",
    status: "IN_PROGRESS",
    title: "Lead title",
    deliveryMode: null,
    expectedValue: null,
    notes: "note",
    responsibleUserId: "seller_1",
    createdAt: new Date("2026-04-09T10:00:00.000Z"),
    updatedAt: new Date("2026-04-09T10:00:00.000Z"),
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false
  };
}

describe("transactional crm deal repository auto-create baseline", () => {
  it("uses upsert by leadId and keeps status in_progress for auto-created deal", async () => {
    const upsert = vi.fn().mockResolvedValue(build_prisma_deal());
    const prismaService = {
      crmDeal: {
        upsert
      }
    } as unknown as ConstructorParameters<typeof PrismaCrmDealRepository>[0];

    const repository = new PrismaCrmDealRepository(prismaService);

    const input = {
      leadId: "lead_1",
      clientId: "client_1",
      contactId: "contact_1",
      responsibleUserId: "seller_1",
      title: "Lead title",
      notes: "note"
    };

    const first = await repository.ensureFromLead(input);
    const second = await repository.ensureFromLead(input);

    expect(first.id).toBe("deal_1");
    expect(first.status).toBe("in_progress");
    expect(second.id).toBe("deal_1");
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { leadId: "lead_1" },
        update: {},
        create: expect.objectContaining({
          leadId: "lead_1",
          status: "IN_PROGRESS"
        })
      })
    );
  });
});
