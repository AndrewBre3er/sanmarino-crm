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
  InventoryMovementReadModel,
  PrismaSupplyRepository,
  ReservationReadModel,
  StockLockReadModel,
  PurchaseReceiptReadModel,
  ProductSupplierReadModel,
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

function make_product_supplier(
  overrides: Partial<ProductSupplierReadModel> = {}
): ProductSupplierReadModel {
  const now = new Date().toISOString();

  return {
    id: "product_supplier_1",
    productId: "00000000-0000-0000-0000-000000000012",
    supplierId: "00000000-0000-0000-0000-000000000010",
    supplierPriority: 1,
    basePurchasePrice: "750.00",
    currency: "RUB",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    supplier: {
      id: "00000000-0000-0000-0000-000000000010",
      name: "Vendor"
    },
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

function make_stock_lock(overrides: Partial<StockLockReadModel> = {}): StockLockReadModel {
  const now = new Date().toISOString();

  return {
    id: "stock_lock_1",
    productId: "00000000-0000-0000-0000-000000000012",
    warehouseId: "00000000-0000-0000-0000-000000000030",
    orderId: null,
    dealId: "00000000-0000-0000-0000-000000000011",
    quantity: "2",
    status: "active",
    idempotencyKey: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    releasedAt: null,
    promotedReservationId: null,
    createdBy: "seller_1",
    createdAt: now,
    updatedAt: now,
    product: {
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    },
    warehouse: {
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    },
    ...overrides
  };
}

function make_reservation(
  overrides: Partial<ReservationReadModel> = {}
): ReservationReadModel {
  const now = new Date().toISOString();

  return {
    id: "reservation_1",
    orderId: "00000000-0000-0000-0000-000000000101",
    productId: "00000000-0000-0000-0000-000000000012",
    warehouseId: "00000000-0000-0000-0000-000000000030",
    quantity: "2",
    status: "active",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    releasedAt: null,
    consumedAt: null,
    createdBy: "seller_1",
    createdAt: now,
    updatedAt: now,
    order: {
      id: "00000000-0000-0000-0000-000000000101",
      orderNumber: "ORD-101"
    },
    product: {
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    },
    warehouse: {
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    },
    ...overrides
  };
}

function make_inventory_movement(
  overrides: Partial<InventoryMovementReadModel> = {}
): InventoryMovementReadModel {
  const now = new Date().toISOString();

  return {
    id: "inventory_movement_1",
    movementType: "receipt",
    productId: "00000000-0000-0000-0000-000000000012",
    warehouseId: "00000000-0000-0000-0000-000000000030",
    quantity: "2",
    bucketFrom: null,
    bucketTo: "on_hand",
    unitCost: "750.00",
    totalCost: "1500.00",
    orderId: null,
    reservationId: null,
    purchaseReceiptId: "purchase_receipt_1",
    returnRequestId: null,
    reason: "receipt baseline",
    performedBy: "warehouse_1",
    createdAt: now,
    updatedAt: now,
    product: {
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    },
    warehouse: {
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    },
    ...overrides
  };
}

function make_service() {
  const repository = {
    listSuppliers: vi.fn(),
    getSupplierById: vi.fn(),
    getOrderById: vi.fn(),
    getProductById: vi.fn(),
    getDealById: vi.fn(),
    getWarehouseById: vi.fn(),
    createSupplier: vi.fn(),
    listProductSuppliers: vi.fn(),
    createProductSupplier: vi.fn(),
    getProductSupplierById: vi.fn(),
    updateProductSupplierById: vi.fn(),
    listSupplierRequests: vi.fn(),
    getSupplierRequestById: vi.fn(),
    createSupplierRequest: vi.fn(),
    updateSupplierRequestById: vi.fn(),
    listPurchaseReceipts: vi.fn(),
    getPurchaseReceiptById: vi.fn(),
    createPurchaseReceipt: vi.fn(),
    listStockLocks: vi.fn(),
    getStockLockById: vi.fn(),
    createStockLock: vi.fn(),
    updateStockLockById: vi.fn(),
    listReservations: vi.fn(),
    getReservationById: vi.fn(),
    createReservations: vi.fn(),
    updateReservationById: vi.fn(),
    listInventoryMovements: vi.fn(),
    getInventoryMovementById: vi.fn(),
    createInventoryMovement: vi.fn()
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

  it("lists product suppliers while hiding base purchase price from seller", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.listProductSuppliers).mockResolvedValue([make_product_supplier()]);

    const result = await service.listProductSuppliers(
      "00000000-0000-0000-0000-000000000012",
      seller
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.supplierPriority).toBe(1);
    expect(result[0]?.basePurchasePrice).toBeNull();
  });

  it("keeps base purchase price visible to finance roles", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.listProductSuppliers).mockResolvedValue([make_product_supplier()]);

    const result = await service.listProductSuppliers(
      "00000000-0000-0000-0000-000000000012",
      finance
    );

    expect(result[0]?.basePurchasePrice).toBe("750.00");
  });

  it("creates product supplier matrix records for price-visible roles", async () => {
    const { service, repository } = make_service();
    const finance = make_user(["finance"], "finance_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
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
    vi.mocked(repository.createProductSupplier).mockResolvedValue(make_product_supplier());

    const created = await service.createProductSupplier(
      "00000000-0000-0000-0000-000000000012",
      {
        supplierId: "00000000-0000-0000-0000-000000000010",
        supplierPriority: 1,
        basePurchasePrice: "750.00",
        isActive: true
      },
      finance
    );

    expect(repository.createProductSupplier).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "00000000-0000-0000-0000-000000000012",
        supplierId: "00000000-0000-0000-0000-000000000010",
        supplierPriority: 1,
        basePurchasePrice: "750.00",
        currency: "RUB",
        isActive: true
      })
    );
    expect(created.basePurchasePrice).toBe("750.00");
  });

  it("patches product supplier matrix records for price-visible roles", async () => {
    const { service, repository } = make_service();
    const ceo = make_user(["ceo"], "ceo_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.getProductSupplierById).mockResolvedValue(make_product_supplier());
    vi.mocked(repository.updateProductSupplierById).mockResolvedValue(
      make_product_supplier({
        supplierPriority: 2,
        basePurchasePrice: "825.50",
        isActive: false
      })
    );

    const updated = await service.patchProductSupplier(
      "00000000-0000-0000-0000-000000000012",
      "product_supplier_1",
      {
        supplierPriority: 2,
        basePurchasePrice: "825.5",
        isActive: false
      },
      ceo
    );

    expect(repository.updateProductSupplierById).toHaveBeenCalledWith(
      "product_supplier_1",
      expect.objectContaining({
        supplierPriority: 2,
        basePurchasePrice: "825.50",
        isActive: false
      })
    );
    expect(updated.supplierPriority).toBe(2);
    expect(updated.basePurchasePrice).toBe("825.50");
  });

  it("blocks seller from writing product supplier base purchase price", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    await expect(
      service.createProductSupplier(
        "00000000-0000-0000-0000-000000000012",
        {
          supplierId: "00000000-0000-0000-0000-000000000010",
          supplierPriority: 1,
          basePurchasePrice: "750.00"
        },
        seller
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.createProductSupplier).not.toHaveBeenCalled();
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

  it("supports stock lock create/list/detail baseline for seller", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");
    const query = build_query();
    const stockLock = make_stock_lock();

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getDealById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000011"
    });
    vi.mocked(repository.createStockLock).mockResolvedValue(stockLock);
    vi.mocked(repository.listStockLocks).mockResolvedValue({
      items: [stockLock],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(repository.getStockLockById).mockResolvedValue(stockLock);

    const created = await service.createStockLock(
      {
        productId: "00000000-0000-0000-0000-000000000012",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        dealId: "00000000-0000-0000-0000-000000000011",
        quantity: 2,
        ttlMinutes: 7
      },
      seller
    );
    const listed = await service.listStockLocks(query);
    const detail = await service.getStockLock("stock_lock_1");

    const createArgs = vi.mocked(repository.createStockLock).mock.calls[0]?.[0];
    expect(createArgs).toEqual(
      expect.objectContaining({
        productId: "00000000-0000-0000-0000-000000000012",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        dealId: "00000000-0000-0000-0000-000000000011",
        quantity: 2,
        status: "active",
        createdBy: "seller_1"
      })
    );
    expect(createArgs).not.toHaveProperty("orderId");
    expect(createArgs).not.toHaveProperty("promotedReservationId");
    expect(createArgs?.expiresAt).toEqual(expect.any(String));
    expect(created.status).toBe("active");
    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("stock_lock_1");
  });

  it("marks active stock lock as expired in read model when TTL is passed", async () => {
    const { service, repository } = make_service();
    vi.mocked(repository.getStockLockById).mockResolvedValue(
      make_stock_lock({
        status: "active",
        expiresAt: new Date(Date.now() - 60_000).toISOString()
      })
    );

    const detail = await service.getStockLock("stock_lock_1");
    expect(detail.status).toBe("expired");
  });

  it("releases active stock lock for seller", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getStockLockById).mockResolvedValue(
      make_stock_lock({
        status: "active",
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
    );
    vi.mocked(repository.updateStockLockById).mockResolvedValue(
      make_stock_lock({
        status: "released",
        releasedAt: new Date().toISOString()
      })
    );

    const released = await service.releaseStockLock("stock_lock_1", seller);

    expect(repository.updateStockLockById).toHaveBeenCalledWith(
      "stock_lock_1",
      expect.objectContaining({
        status: "released",
        releasedAt: expect.any(String)
      })
    );
    expect(released.status).toBe("released");
  });

  it("rejects stock lock release when lock is already expired", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getStockLockById).mockResolvedValue(
      make_stock_lock({
        status: "active",
        expiresAt: new Date(Date.now() - 60_000).toISOString()
      })
    );

    await expect(service.releaseStockLock("stock_lock_1", seller)).rejects.toBeInstanceOf(
      ConflictException
    );
    expect(repository.updateStockLockById).not.toHaveBeenCalled();
  });

  it("enforces stock lock create/release role baseline: seller only", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    await expect(
      service.createStockLock(
        {
          productId: "00000000-0000-0000-0000-000000000012",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          dealId: "00000000-0000-0000-0000-000000000011",
          quantity: 1
        },
        warehouse
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.releaseStockLock("stock_lock_1", warehouse)).rejects.toBeInstanceOf(
      ForbiddenException
    );

    expect(repository.createStockLock).not.toHaveBeenCalled();
    expect(repository.updateStockLockById).not.toHaveBeenCalled();
  });

  it("rejects stock lock create when linkage is invalid", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getProductById).mockResolvedValue(null);

    await expect(
      service.createStockLock(
        {
          productId: "00000000-0000-0000-0000-000000000012",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          dealId: "00000000-0000-0000-0000-000000000011",
          quantity: 1
        },
        seller
      )
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.createStockLock).not.toHaveBeenCalled();
  });

  it("rejects stock lock create when ttl is outside short-lived range", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getDealById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000011"
    });

    await expect(
      service.createStockLock(
        {
          productId: "00000000-0000-0000-0000-000000000012",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          dealId: "00000000-0000-0000-0000-000000000011",
          quantity: 1,
          ttlMinutes: 3
        },
        seller
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createStockLock).not.toHaveBeenCalled();
  });

  it("supports reservation list/detail baseline", async () => {
    const { service, repository } = make_service();
    const query = build_query();
    const reservation = make_reservation();

    vi.mocked(repository.listReservations).mockResolvedValue({
      items: [reservation],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(repository.getReservationById).mockResolvedValue(reservation);

    const listed = await service.listReservations(query);
    const detail = await service.getReservation("reservation_1");

    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("reservation_1");
    expect(detail.order.orderNumber).toBe("ORD-101");
  });

  it("marks active reservation as expired in read model when TTL is passed", async () => {
    const { service, repository } = make_service();
    vi.mocked(repository.getReservationById).mockResolvedValue(
      make_reservation({
        status: "active",
        expiresAt: new Date(Date.now() - 60_000).toISOString()
      })
    );

    const detail = await service.getReservation("reservation_1");
    expect(detail.status).toBe("expired");
  });

  it("rejects reservation create when order does not exist", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getOrderById).mockResolvedValue(null);

    await expect(
      service.createReservationsForOrder(
        {
          orderId: "00000000-0000-0000-0000-000000000101",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          items: [
            {
              productId: "00000000-0000-0000-0000-000000000012",
              quantity: 2,
              expiresAt: "2026-04-15T10:00:00.000Z"
            }
          ]
        },
        seller
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createReservations).not.toHaveBeenCalled();
  });

  it("creates reservation only with order and without issue/writeoff side effects", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getOrderById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000101",
      orderNumber: "ORD-101",
      isDeleted: false
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.createReservations).mockResolvedValue([make_reservation()]);

    const created = await service.createReservationsForOrder(
      {
        orderId: "00000000-0000-0000-0000-000000000101",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        ]
      },
      seller
    );

    expect(repository.createReservations).toHaveBeenCalledWith([
      expect.objectContaining({
        orderId: "00000000-0000-0000-0000-000000000101",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        productId: "00000000-0000-0000-0000-000000000012",
        quantity: 2,
        status: "active",
        createdBy: "seller_1"
      })
    ]);
    expect(created).toHaveLength(1);
    expect(created[0]?.status).toBe("active");
    expect(repository.createStockLock).not.toHaveBeenCalled();
    const movementTypes = vi
      .mocked(repository.createInventoryMovement)
      .mock.calls.map((call) => call[0]?.movementType);
    expect(movementTypes).not.toContain("issue");
    expect(movementTypes).not.toContain("writeoff");
  });

  it("keeps reservation layer separated from soft lock layer", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getOrderById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000101",
      orderNumber: "ORD-101",
      isDeleted: false
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.createReservations).mockResolvedValue([make_reservation()]);

    await service.createReservationsForOrder(
      {
        orderId: "00000000-0000-0000-0000-000000000101",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        ]
      },
      seller
    );

    expect(repository.createReservations).toHaveBeenCalledOnce();
    expect(repository.createStockLock).not.toHaveBeenCalled();
    expect(repository.updateStockLockById).not.toHaveBeenCalled();
  });

  it("releases active reservation via internal foundation path", async () => {
    const { service, repository } = make_service();

    vi.mocked(repository.getReservationById).mockResolvedValue(
      make_reservation({
        status: "active",
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
    );
    vi.mocked(repository.updateReservationById).mockResolvedValue(
      make_reservation({
        status: "released",
        releasedAt: new Date().toISOString()
      })
    );

    const released = await service.releaseReservationInternal("reservation_1");

    expect(repository.updateReservationById).toHaveBeenCalledWith(
      "reservation_1",
      expect.objectContaining({
        status: "released",
        releasedAt: expect.any(String)
      })
    );
    expect(released.status).toBe("released");
  });

  it("supports inventory movement list/detail baseline", async () => {
    const { service, repository } = make_service();
    const query = build_query();
    const movement = make_inventory_movement();

    vi.mocked(repository.listInventoryMovements).mockResolvedValue({
      items: [movement],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }
    });
    vi.mocked(repository.getInventoryMovementById).mockResolvedValue(movement);

    const listed = await service.listInventoryMovements(query);
    const detail = await service.getInventoryMovement("inventory_movement_1");

    expect(listed.items).toHaveLength(1);
    expect(detail.id).toBe("inventory_movement_1");
    expect(detail.movementType).toBe("receipt");
  });

  it("records receipt movement without converting to issue", async () => {
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
    vi.mocked(repository.createPurchaseReceipt).mockResolvedValue(make_purchase_receipt());
    vi.mocked(repository.createInventoryMovement).mockResolvedValue(make_inventory_movement());

    await service.createPurchaseReceipt(
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
            unitCost: "750.00",
            supplierRequestItemId: "item_1"
          }
        ]
      },
      warehouse
    );

    const inventoryMovementCalls = vi.mocked(repository.createInventoryMovement).mock.calls;
    expect(inventoryMovementCalls.length).toBe(1);
    expect(inventoryMovementCalls[0]?.[0]).toEqual(
      expect.objectContaining({
        movementType: "receipt",
        bucketTo: "on_hand",
        purchaseReceiptId: "purchase_receipt_1"
      })
    );
    expect(inventoryMovementCalls[0]?.[0]).not.toEqual(
      expect.objectContaining({
        movementType: "issue"
      })
    );
  });

  it("records reservation create/release movements without issue semantics", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    vi.mocked(repository.getOrderById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000101",
      orderNumber: "ORD-101",
      isDeleted: false
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.createReservations).mockResolvedValue([make_reservation()]);
    vi.mocked(repository.createInventoryMovement).mockResolvedValue(make_inventory_movement());
    vi.mocked(repository.getReservationById).mockResolvedValue(
      make_reservation({
        status: "active",
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      })
    );
    vi.mocked(repository.updateReservationById).mockResolvedValue(
      make_reservation({
        status: "released",
        releasedAt: new Date().toISOString()
      })
    );

    await service.createReservationsForOrder(
      {
        orderId: "00000000-0000-0000-0000-000000000101",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        items: [
          {
            productId: "00000000-0000-0000-0000-000000000012",
            quantity: 2,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          }
        ]
      },
      seller
    );
    await service.releaseReservationInternal("reservation_1");

    const movementTypes = vi
      .mocked(repository.createInventoryMovement)
      .mock.calls.map((call) => call[0]?.movementType);

    expect(movementTypes).toContain("reservation_create");
    expect(movementTypes).toContain("reservation_release");
    expect(movementTypes).not.toContain("issue");
  });

  it("supports transfer-to-quarantine baseline", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.createInventoryMovement).mockResolvedValue(
      make_inventory_movement({
        movementType: "transfer_to_quarantine",
        bucketFrom: "available",
        bucketTo: "quarantine",
        reason: "damaged"
      })
    );

    const movement = await service.transferToQuarantine(
      {
        productId: "00000000-0000-0000-0000-000000000012",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        quantity: 1,
        reason: "damaged"
      },
      warehouse
    );

    expect(movement.movementType).toBe("transfer_to_quarantine");
    expect(movement.bucketTo).toBe("quarantine");
    expect(movement.bucketFrom).toBe("available");
  });

  it("supports release-from-quarantine baseline", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    vi.mocked(repository.getProductById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000012",
      sku: "SKU-1",
      name: "Tile",
      unit: "шт"
    });
    vi.mocked(repository.getWarehouseById).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000030",
      name: "Main warehouse"
    });
    vi.mocked(repository.createInventoryMovement).mockResolvedValue(
      make_inventory_movement({
        movementType: "release_from_quarantine",
        bucketFrom: "quarantine",
        bucketTo: "available",
        reason: "quality_check_passed"
      })
    );

    const movement = await service.releaseFromQuarantine(
      {
        productId: "00000000-0000-0000-0000-000000000012",
        warehouseId: "00000000-0000-0000-0000-000000000030",
        quantity: 1,
        reason: "quality_check_passed"
      },
      warehouse
    );

    expect(movement.movementType).toBe("release_from_quarantine");
    expect(movement.bucketFrom).toBe("quarantine");
    expect(movement.bucketTo).toBe("available");
  });

  it("rejects quarantine movement create for non-warehouse role", async () => {
    const { service, repository } = make_service();
    const seller = make_user(["seller"], "seller_1");

    await expect(
      service.transferToQuarantine(
        {
          productId: "00000000-0000-0000-0000-000000000012",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          quantity: 1,
          reason: "damaged"
        },
        seller
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.createInventoryMovement).not.toHaveBeenCalled();
  });

  it("rejects quarantine movement create when quantity is invalid", async () => {
    const { service, repository } = make_service();
    const warehouse = make_user(["warehouse"], "warehouse_1");

    await expect(
      service.releaseFromQuarantine(
        {
          productId: "00000000-0000-0000-0000-000000000012",
          warehouseId: "00000000-0000-0000-0000-000000000030",
          quantity: 0,
          reason: "quality_check_passed"
        },
        warehouse
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createInventoryMovement).not.toHaveBeenCalled();
  });
});
