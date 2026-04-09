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
  CrmLeadRecord,
  PrismaCrmLeadRepository
} from "../../src/modules/transactional/crm/lead.repository";

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

  return {
    service: new LeadsService(readRepository, writeRepository),
    readRepository,
    writeRepository
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

  it("applies valid status transition new -> in_processing", async () => {
    const { service, writeRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(make_lead_record({ status: "new" }));
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
    expect(updated.status).toBe("in_processing");
  });

  it("rejects invalid status transition", async () => {
    const { service, writeRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(writeRepository.findById).mockResolvedValue(
      make_lead_record({ status: "in_processing" })
    );

    await expect(
      service.updateLeadStatus("lead_1", { status: "cancelled", reason: "cancel" }, seller)
    ).rejects.toBeInstanceOf(ConflictException);
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

  it("returns not found for missing lead detail", async () => {
    const { service, readRepository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    vi.mocked(readRepository.getById).mockResolvedValue(null);

    await expect(service.getLead("missing", seller)).rejects.toBeInstanceOf(NotFoundException);
  });
});
