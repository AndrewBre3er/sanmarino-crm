import {
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal, AuthRoleCode } from "../../src/modules/auth/auth.contract";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaSupplyRepository } from "../../src/modules/supply/supply.repository";
import { SupplyService } from "../../src/modules/supply/supply.service";

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

function make_service() {
  const repository = {
    listSuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    createSupplier: vi.fn(),
    listSupplierRequests: vi.fn(),
    getSupplierRequestById: vi.fn(),
    createSupplierRequest: vi.fn()
  } as unknown as PrismaSupplyRepository;

  return {
    service: new SupplyService(repository),
    repository
  };
}

describe("supply service", () => {
  it("supports supplier create/list/detail baseline", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();
    const supplier = {
      id: "supplier_1",
      name: "Vendor",
      phone: "123",
      email: "vendor@example.com",
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    vi.mocked(repository.createSupplier).mockResolvedValue(supplier);
    vi.mocked(repository.listSuppliers).mockResolvedValue({
      items: [supplier],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue(supplier);

    const created = await service.createSupplier(
      { name: " Vendor ", phone: " 123 ", email: " vendor@example.com " },
      seller
    );
    const listed = await service.listSuppliers(query);
    const detail = await service.getSupplier("supplier_1");

    expect(repository.createSupplier).toHaveBeenCalledWith({
      name: "Vendor",
      phone: "123",
      email: "vendor@example.com"
    });
    expect(created.name).toBe("Vendor");
    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("supplier_1");
  });

  it("creates supplier request with formed status and source-linked items for seller", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const now = new Date().toISOString();
    const createdRequest = {
      id: "supplier_request_1",
      supplierId: "00000000-0000-0000-0000-000000000010",
      businessSourceType: "deal" as const,
      businessSourceId: "00000000-0000-0000-0000-000000000011",
      status: "formed" as const,
      expectedSupplyDate: "2026-04-10",
      requestedBy: "seller_1",
      confirmedBy: null,
      paidBy: null,
      paidAt: null,
      stockedBy: null,
      stockedAt: null,
      supplierDocumentUrl: null,
      createdAt: now,
      updatedAt: now,
      supplier: {
        id: "00000000-0000-0000-0000-000000000010",
        name: "Vendor"
      },
      items: [
        {
          id: "item_1",
          productId: "00000000-0000-0000-0000-000000000012",
          quantity: "2",
          unit: "шт" as const,
          sourceLineRef: "deal-line-1",
          sourceLineContext: { sourceDocument: "deal", sourceLineNo: 1 },
          createdAt: now,
          updatedAt: now
        }
      ]
    };

    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: now,
      updatedAt: now
    });
    vi.mocked(repository.createSupplierRequest).mockResolvedValue(createdRequest);

    const created = await service.createSupplierRequest(
      {
        supplierId: "00000000-0000-0000-0000-000000000010",
        businessSourceType: "deal",
        businessSourceId: "00000000-0000-0000-0000-000000000011",
        expectedSupplyDate: "2026-04-10",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            unit: "шт",
            sourceLineRef: " deal-line-1 ",
            sourceLineContext: { sourceDocument: "deal", sourceLineNo: 1 }
          }
        ]
      },
      seller
    );

    expect(repository.createSupplierRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: "00000000-0000-0000-0000-000000000010",
        businessSourceType: "deal",
        businessSourceId: "00000000-0000-0000-0000-000000000011",
        status: "formed",
        expectedSupplyDate: "2026-04-10",
        requestedBy: "seller_1",
        items: [
          expect.objectContaining({
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            unit: "шт",
            sourceLineRef: "deal-line-1"
          })
        ]
      })
    );
    expect(created.status).toBe("formed");
    expect(created.items).toHaveLength(1);
  });

  it("rejects supplier request create for non-seller role", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    await expect(
      service.createSupplierRequest(
        {
          supplierId: "00000000-0000-0000-0000-000000000010",
          businessSourceType: "deal",
          businessSourceId: "00000000-0000-0000-0000-000000000011",
          expectedSupplyDate: "2026-04-10",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 1,
              unit: "шт",
              sourceLineRef: "deal-line-1"
            }
          ]
        },
        finance
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.getSupplierById).not.toHaveBeenCalled();
    expect(repository.createSupplierRequest).not.toHaveBeenCalled();
  });

  it("rejects create when supplier does not exist", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getSupplierById).mockResolvedValue(null);

    await expect(
      service.createSupplierRequest(
        {
          supplierId: "00000000-0000-0000-0000-000000000099",
          businessSourceType: "deal",
          businessSourceId: "00000000-0000-0000-0000-000000000011",
          expectedSupplyDate: "2026-04-10",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 1,
              unit: "шт",
              sourceLineRef: "deal-line-1"
            }
          ]
        },
        seller
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
