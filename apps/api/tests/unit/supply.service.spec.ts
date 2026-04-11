import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthPrincipal, AuthRoleCode } from "../../src/modules/auth/auth.contract";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type {
  PrismaSupplyRepository,
  PurchaseReceiptReadModel,
  SupplierRequestReadModel
} from "../../src/modules/supply/supply.repository";
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

function make_supplier_request(
  status: "formed" | "confirmed_by_supplier" | "paid" | "stocked",
  overrides: Partial<SupplierRequestReadModel> = {}
): SupplierRequestReadModel {
  const now = new Date().toISOString();

  return {
    id: "supplier_request_1",
    supplierId: "00000000-0000-0000-0000-000000000010",
    businessSourceType: "deal",
    businessSourceId: "00000000-0000-0000-0000-000000000011",
    status,
    expectedSupplyDate: "2026-04-10",
    requestedBy: "seller_1",
    confirmedBy: status === "formed" ? null : "seller_1",
    paidBy: status === "paid" || status === "stocked" ? "finance_1" : null,
    paidAt:
      status === "paid" || status === "stocked"
        ? new Date("2026-04-11T00:00:00.000Z").toISOString()
        : null,
    stockedBy: status === "stocked" ? "warehouse_1" : null,
    stockedAt: status === "stocked" ? new Date("2026-04-12T00:00:00.000Z").toISOString() : null,
    supplierDocumentUrl: "https://storage.local/supplier-request-1.pdf",
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
        unit: "шт",
        sourceLineRef: "deal-line-1",
        sourceLineContext: { sourceDocument: "deal", sourceLineNo: 1 },
        createdAt: now,
        updatedAt: now
      }
    ],
    ...overrides
  };
}

function make_purchase_receipt(
  overrides: Partial<PurchaseReceiptReadModel> = {}
): PurchaseReceiptReadModel {
  const now = new Date().toISOString();

  return {
    id: "purchase_receipt_1",
    receiptNumber: "PR-test-1",
    warehouseId: "00000000-0000-0000-0000-000000000030",
    supplierId: "00000000-0000-0000-0000-000000000010",
    supplierRequestId: "supplier_request_1",
    receivedAt: "2026-04-15T10:00:00.000Z",
    createdBy: "warehouse_1",
    createdAt: now,
    updatedAt: now,
    supplier: {
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor"
    },
    warehouse: {
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    },
    supplierRequest: {
      id: "supplier_request_1",
      status: "paid"
    },
    items: [
      {
        id: "receipt_item_1",
        productId: "00000000-0000-0000-0000-000000000012",
        quantity: "2",
        unit: "шт",
        unitCost: "750",
        lineTotal: "1500",
        supplierRequestItemId: "item_1",
        requestedQuantity: "2"
      }
    ],
    discrepancy: {
      hasDiscrepancy: false,
      lines: []
    },
    ...overrides
  };
}

function make_service() {
  const repository = {
    listSuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    getWarehouseById: vi.fn(),
    createSupplier: vi.fn(),
    listSupplierRequests: vi.fn(),
    getSupplierRequestById: vi.fn(),
    createSupplierRequest: vi.fn(),
    updateSupplierRequestById: vi.fn(),
    listPurchaseReceipts: vi.fn(),
    getPurchaseReceiptById: vi.fn(),
    createPurchaseReceipt: vi.fn()
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

  it("keeps seller create baseline for supplier request", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const now = new Date().toISOString();
    const createdRequest = {
      ...make_supplier_request("formed"),
      createdAt: now,
      updatedAt: now
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
        status: "formed",
        requestedBy: "seller_1",
        items: [
          expect.objectContaining({
            sourceLineRef: "deal-line-1"
          })
        ]
      })
    );
    expect(created.status).toBe("formed");
  });

  it("supports purchase receipt create/list/detail baseline for warehouse", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");
    const query = build_query();

    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("paid"));

    const createdReceipt = make_purchase_receipt();
    vi.mocked(repository.createPurchaseReceipt).mockResolvedValue(createdReceipt);
    vi.mocked(repository.listPurchaseReceipts).mockResolvedValue({
      items: [{ ...createdReceipt, hasDiscrepancy: createdReceipt.discrepancy.hasDiscrepancy }],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(repository.getPurchaseReceiptById).mockResolvedValue(createdReceipt);

    const created = await service.createPurchaseReceipt(
      {
        warehouseId: "00000000-0000-0000-0000-000000000030",
        supplierId: "00000000-0000-0000-0000-000000000010",
        supplierRequestId: "supplier_request_1",
        receivedAt: "2026-04-15T10:00:00.000Z",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            unit: "шт",
            unitCost: "750.00"
          }
        ]
      },
      warehouse
    );

    const listed = await service.listPurchaseReceipts(query);
    const detail = await service.getPurchaseReceipt("purchase_receipt_1");

    expect(repository.createPurchaseReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        warehouseId: "00000000-0000-0000-0000-000000000030",
        supplierId: "00000000-0000-0000-0000-000000000010",
        supplierRequestId: "supplier_request_1",
        createdBy: "warehouse_1",
        items: [
          expect.objectContaining({
            productId: "00000000-0000-0000-0000-000000000012",
            supplierRequestItemId: "item_1",
            unitCost: "750.00"
          })
        ]
      })
    );
    expect(created.id).toBe("purchase_receipt_1");
    expect(listed.items).toHaveLength(1);
    expect(detail.receiptNumber).toBe("PR-test-1");
  });

  it("reflects discrepancy baseline in purchase receipt response", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("paid"));

    vi.mocked(repository.createPurchaseReceipt).mockResolvedValue(
      make_purchase_receipt({
        items: [
          {
            id: "receipt_item_1",
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: "3",
            unit: "шт",
            unitCost: "750",
            lineTotal: "2250",
            supplierRequestItemId: "item_1",
            requestedQuantity: "2"
          }
        ],
        discrepancy: {
          hasDiscrepancy: true,
          lines: [
            {
              supplierRequestItemId: "item_1",
              productId: "00000000-0000-0000-0000-000000000012",
              unit: "шт",
              requestedQuantity: "2",
              receivedQuantity: "3",
              discrepancyQuantity: "1"
            }
          ]
        }
      })
    );

    const created = await service.createPurchaseReceipt(
      {
        warehouseId: "00000000-0000-0000-0000-000000000030",
        supplierId: "00000000-0000-0000-0000-000000000010",
        supplierRequestId: "supplier_request_1",
        receivedAt: "2026-04-15T10:00:00.000Z",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 3,
            unit: "шт",
            unitCost: "750.00",
            supplierRequestItemId: "item_1"
          }
        ]
      },
      warehouse
    );

    expect(created.discrepancy.hasDiscrepancy).toBe(true);
    expect(created.discrepancy.lines).toHaveLength(1);
    expect(created.discrepancy.lines[0]?.discrepancyQuantity).toBe("1");
  });

  it("applies file visibility baseline: detail is visible to all, file only to warehouse/finance/ceo", async () => {
    const { service, repository } = make_service();
    const request = make_supplier_request("formed");
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(request);

    const seller = make_user(["seller"], "seller_1");
    const finance = make_user(["finance"], "finance_1");

    const sellerView = await service.getSupplierRequest("supplier_request_1", seller);
    const financeView = await service.getSupplierRequest("supplier_request_1", finance);

    expect(sellerView.id).toBe("supplier_request_1");
    expect(sellerView.status).toBe("formed");
    expect(sellerView.supplierDocumentUrl).toBeNull();
    expect(financeView.supplierDocumentUrl).toBe("https://storage.local/supplier-request-1.pdf");
  });

  it("enforces formed -> confirmed_by_supplier transition", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("formed"));
    vi.mocked(repository.updateSupplierRequestById).mockResolvedValue(
      make_supplier_request("confirmed_by_supplier")
    );

    const updated = await service.confirmSupplierRequestBySupplier(
      "supplier_request_1",
      { expectedSupplyDate: "2026-04-11" },
      seller
    );

    expect(repository.updateSupplierRequestById).toHaveBeenCalledWith(
      "supplier_request_1",
      expect.objectContaining({
        status: "confirmed_by_supplier",
        expectedSupplyDate: "2026-04-11",
        confirmedBy: "seller_1"
      })
    );
    expect(updated.status).toBe("confirmed_by_supplier");
  });

  it("rejects invalid transition outside matrix", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("formed"));

    await expect(
      service.markSupplierRequestPaid("supplier_request_1", finance)
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.updateSupplierRequestById).not.toHaveBeenCalled();
  });

  it("enforces paid transition role: only finance or ceo", async () => {
    const { service } = make_service();
    const seller = make_user(["seller"], "seller_1");

    await expect(
      service.markSupplierRequestPaid("supplier_request_1", seller)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("enforces stocked transition role: only warehouse", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    await expect(
      service.markSupplierRequestStocked("supplier_request_1", finance)
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.getSupplierRequestById).not.toHaveBeenCalled();
  });

  it("enforces purchase receipt create role: only warehouse", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    await expect(
      service.createPurchaseReceipt(
        {
          warehouseId: "00000000-0000-0000-0000-000000000030",
          supplierId: "00000000-0000-0000-0000-000000000010",
          supplierRequestId: "supplier_request_1",
          receivedAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 2,
              unit: "шт",
              unitCost: "750.00"
            }
          ]
        },
        seller
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.createPurchaseReceipt).not.toHaveBeenCalled();
  });

  it("returns not found for invalid supplier request linkage in receipt create", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(null);

    await expect(
      service.createPurchaseReceipt(
        {
          warehouseId: "00000000-0000-0000-0000-000000000030",
          supplierId: "00000000-0000-0000-0000-000000000010",
          supplierRequestId: "missing_request",
          receivedAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 2,
              unit: "шт",
              unitCost: "750.00"
            }
          ]
        },
        warehouse
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects receipt create when supplier does not match supplier request", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(
      make_supplier_request("paid", {
        supplierId: "00000000-0000-0000-0000-000000000099"
      })
    );

    await expect(
      service.createPurchaseReceipt(
        {
          warehouseId: "00000000-0000-0000-0000-000000000030",
          supplierId: "00000000-0000-0000-0000-000000000010",
          supplierRequestId: "supplier_request_1",
          receivedAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 2,
              unit: "шт",
              unitCost: "750.00"
            }
          ]
        },
        warehouse
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects receipt item linkage when item is not aligned with supplier request items", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getSupplierById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor",
      phone: null,
      email: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("paid"));

    await expect(
      service.createPurchaseReceipt(
        {
          warehouseId: "00000000-0000-0000-0000-000000000030",
          supplierId: "00000000-0000-0000-0000-000000000010",
          supplierRequestId: "supplier_request_1",
          receivedAt: "2026-04-15T10:00:00.000Z",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000013",
              quantity: 2,
              unit: "шт",
              unitCost: "750.00"
            }
          ]
        },
        warehouse
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createPurchaseReceipt).not.toHaveBeenCalled();
  });

  it("supports confirmed_by_supplier -> paid for finance/ceo", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(
      make_supplier_request("confirmed_by_supplier")
    );
    vi.mocked(repository.updateSupplierRequestById).mockResolvedValue(
      make_supplier_request("paid")
    );

    const updated = await service.markSupplierRequestPaid("supplier_request_1", finance);

    expect(repository.updateSupplierRequestById).toHaveBeenCalledWith(
      "supplier_request_1",
      expect.objectContaining({
        status: "paid",
        paidBy: "finance_1",
        paidAt: expect.any(String)
      })
    );
    expect(updated.status).toBe("paid");
  });

  it("supports paid -> stocked for warehouse", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(make_supplier_request("paid"));
    vi.mocked(repository.updateSupplierRequestById).mockResolvedValue(
      make_supplier_request("stocked")
    );

    const updated = await service.markSupplierRequestStocked("supplier_request_1", warehouse);

    expect(repository.updateSupplierRequestById).toHaveBeenCalledWith(
      "supplier_request_1",
      expect.objectContaining({
        status: "stocked",
        stockedBy: "warehouse_1",
        stockedAt: expect.any(String)
      })
    );
    expect(updated.status).toBe("stocked");
  });

  it("returns not found for missing supplier request in status command", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");
    vi.mocked(repository.getSupplierRequestById).mockResolvedValue(null);

    await expect(
      service.markSupplierRequestStocked("missing_request", warehouse)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
