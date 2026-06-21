import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { LeadsService } from "../../src/modules/leads/leads.service";
import type { AuthPrincipal, AuthRoleCode } from "../../src/modules/auth/auth.contract";
import type {
  CrmLeadReadModel,
  PrismaCrmLeadReadRepository
} from "../../src/modules/read-side/crm/lead.read.repository";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type {
  CrmDealRecord,
  PrismaCrmDealRepository
} from "../../src/modules/transactional/crm/deal.repository";
import type {
  CrmLeadRecord,
  PrismaCrmLeadRepository
} from "../../src/modules/transactional/crm/lead.repository";
import type {
  OrdersOrderRecord,
  PrismaOrdersOrderRepository
} from "../../src/modules/transactional/orders/order.repository";

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "createdAt",
    sortDirection: "desc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      sort: [{ field: "createdAt", direction: "desc" }]
    }
  };
}

function make_user(roleCodes: AuthRoleCode[], userId = "user_1"): AuthPrincipal {
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

function make_lead_record(overrides: Partial<CrmLeadRecord> = {}): CrmLeadRecord {
  const now = new Date().toISOString();
  return {
    id: "lead_1",
    source: "site",
    status: "new",
    clientId: null,
    contactId: null,
    title: "Lead",
    notes: null,
    responsibleUserId: "seller_1",
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...overrides
  };
}

function make_lead_read_model(overrides: Partial<CrmLeadReadModel> = {}): CrmLeadReadModel {
  const record = make_lead_record();
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
    version: record.version ?? 1,
    ...overrides
  };
}

function make_deal_record(overrides: Partial<CrmDealRecord> = {}): CrmDealRecord {
  const now = new Date().toISOString();
  return {
    id: "deal_1",
    leadId: "lead_1",
    clientId: "client_1",
    contactId: "contact_1",
    status: "in_progress",
    title: "Lead title",
    deliveryMode: null,
    expectedValue: null,
    notes: null,
    responsibleUserId: "seller_1",
    createdAt: now,
    updatedAt: now,
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false,
    ...overrides
  };
}

function make_order_record(overrides: Partial<OrdersOrderRecord> = {}): OrdersOrderRecord {
  const now = new Date().toISOString();
  return {
    id: "order_1",
    orderNumber: "ORD-DEAL-lead_1",
    dealId: "deal_1",
    clientId: "client_1",
    status: "assembling",
    paymentControlStatus: "none",
    paymentControlDueAt: null,
    fulfillmentType: "manual",
    deliveryStatus: "not_scheduled",
    currency: "RUB",
    subtotalAmount: "0",
    discountAmount: "0",
    totalAmount: "0",
    notes: null,
    readyForPartialShipmentAt: null,
    readyForShipmentAt: null,
    partiallyShippedAt: null,
    shippedAt: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    isDeleted: false,
    ...overrides
  };
}

function make_service() {
  const readRepository = {
    list: vi.fn(),
    getById: vi.fn()
  } as unknown as PrismaCrmLeadReadRepository;

  const writeRepository = {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    softDeleteById: vi.fn(),
    restoreById: vi.fn(),
    withTransaction: vi.fn()
  } as unknown as PrismaCrmLeadRepository;

  const dealRepository = {
    ensureFromLead: vi.fn(),
    markConvertedToOrder: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    softDeleteById: vi.fn(),
    restoreById: vi.fn(),
    withTransaction: vi.fn()
  } as unknown as PrismaCrmDealRepository;

  const orderRepository = {
    ensureFromDeal: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    softDeleteById: vi.fn(),
    restoreById: vi.fn(),
    withTransaction: vi.fn()
  } as unknown as PrismaOrdersOrderRepository;

  return {
    service: new LeadsService(readRepository, writeRepository, dealRepository, orderRepository),
    readRepository,
    writeRepository,
    dealRepository,
    orderRepository
  };
}

describe("leads service", () => {
  it("creates lead for seller with self-assignment", async () => {
    const { service, writeRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.create).mockResolvedValue(make_lead_record());

    const result = await service.createLead({ source: "  site  " }, seller);

    expect(writeRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "site",
        status: "new",
        responsibleUserId: "seller_1"
      })
    );
    expect(result.status).toBe("new");
  });

  it("returns list/detail for owned leads and constrains seller scope", async () => {
    const { service, readRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();

    vi.mocked(readRepository.list).mockResolvedValue({
      items: [make_lead_read_model()],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(readRepository.getById).mockResolvedValue(make_lead_read_model());

    const list = await service.listLeads(query, undefined, seller);
    const detail = await service.getLead("lead_1", seller);

    expect(readRepository.list).toHaveBeenCalledWith(query, {
      responsibleUserId: "seller_1"
    });
    expect(list.items).toHaveLength(1);
    expect(detail.id).toBe("lead_1");
  });

  it("applies valid status transition new -> in_processing and auto-creates deal/order baseline", async () => {
    const { service, writeRepository, dealRepository, orderRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({
        status: "new",
        clientId: "client_1",
        responsibleUserId: "seller_1",
        title: "Lead title"
      })
    );
    vi.mocked(dealRepository.ensureFromLead).mockResolvedValue(make_deal_record());
    vi.mocked(orderRepository.ensureFromDeal).mockResolvedValue(make_order_record());
    vi.mocked(dealRepository.markConvertedToOrder).mockResolvedValue(
      make_deal_record({ status: "converted_to_order" })
    );
    vi.mocked(writeRepository.updateById).mockResolvedValue(
      make_lead_record({ status: "in_processing" })
    );

    const updated = await service.updateLeadStatus(
      "lead_1",
      { status: "in_processing" },
      seller
    );

    expect(writeRepository.updateById).toHaveBeenCalledWith(
      "lead_1",
      expect.objectContaining({ status: "in_processing" })
    );
    expect(dealRepository.ensureFromLead).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: "lead_1",
        clientId: "client_1",
        responsibleUserId: "seller_1",
        title: "Lead title"
      })
    );
    expect(orderRepository.ensureFromDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: "deal_1",
        clientId: "client_1"
      })
    );
    expect(dealRepository.markConvertedToOrder).toHaveBeenCalledWith("deal_1");
    expect(updated.status).toBe("in_processing");
  });

  it("rejects invalid status transition", async () => {
    const { service, writeRepository, dealRepository, orderRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({ status: "in_processing" })
    );

    await expect(
      service.updateLeadStatus("lead_1", { status: "cancelled", reason: "cancel" }, seller)
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dealRepository.ensureFromLead).not.toHaveBeenCalled();
    expect(orderRepository.ensureFromDeal).not.toHaveBeenCalled();
  });

  it("rejects new -> cancelled without reason", async () => {
    const { service, writeRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(make_lead_record({ status: "new" }));

    await expect(
      service.updateLeadStatus("lead_1", { status: "cancelled" }, seller)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects seller access to foreign lead", async () => {
    const { service, readRepository, writeRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(readRepository.getById).mockResolvedValue(
      make_lead_read_model({ responsibleUserId: "seller_2" })
    );
    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({ responsibleUserId: "seller_2" })
    );

    await expect(service.getLead("lead_1", seller)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateLeadStatus("lead_1", { status: "in_processing" }, seller)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("handles repeated in_processing status idempotently without duplicate order creation flow", async () => {
    const { service, writeRepository, dealRepository, orderRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({
        status: "in_processing",
        clientId: "client_1",
        responsibleUserId: "seller_1",
        title: "Lead title"
      })
    );
    vi.mocked(dealRepository.ensureFromLead).mockResolvedValue(make_deal_record());
    vi.mocked(orderRepository.ensureFromDeal).mockResolvedValue(make_order_record());
    vi.mocked(dealRepository.markConvertedToOrder).mockResolvedValue(
      make_deal_record({ status: "converted_to_order" })
    );

    const updated = await service.updateLeadStatus(
      "lead_1",
      { status: "in_processing" },
      seller
    );

    expect(dealRepository.ensureFromLead).toHaveBeenCalledTimes(1);
    expect(orderRepository.ensureFromDeal).toHaveBeenCalledTimes(1);
    expect(dealRepository.markConvertedToOrder).toHaveBeenCalledTimes(1);
    expect(writeRepository.updateById).not.toHaveBeenCalled();
    expect(updated.status).toBe("in_processing");
  });

  it("does not create deal when cancelled lead is moved to in_processing", async () => {
    const { service, writeRepository, dealRepository, orderRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({ status: "cancelled", clientId: "client_1", responsibleUserId: "seller_1" })
    );

    await expect(
      service.updateLeadStatus("lead_1", { status: "in_processing" }, seller)
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dealRepository.ensureFromLead).not.toHaveBeenCalled();
    expect(orderRepository.ensureFromDeal).not.toHaveBeenCalled();
  });

  it("does not create order for cancelled deal state returned from ensure flow", async () => {
    const { service, writeRepository, dealRepository, orderRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({
        status: "new",
        clientId: "client_1",
        responsibleUserId: "seller_1",
        title: "Lead title"
      })
    );
    vi.mocked(dealRepository.ensureFromLead).mockResolvedValue(
      make_deal_record({ status: "cancelled" })
    );

    await expect(
      service.updateLeadStatus("lead_1", { status: "in_processing" }, seller)
    ).rejects.toBeInstanceOf(ConflictException);

    expect(orderRepository.ensureFromDeal).not.toHaveBeenCalled();
    expect(dealRepository.markConvertedToOrder).not.toHaveBeenCalled();
    expect(writeRepository.updateById).not.toHaveBeenCalled();
  });

  it("returns not found for missing lead detail", async () => {
    const { service, readRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    vi.mocked(readRepository.getById).mockResolvedValue(null);

    await expect(service.getLead("missing", seller)).rejects.toBeInstanceOf(NotFoundException);
  });
});
