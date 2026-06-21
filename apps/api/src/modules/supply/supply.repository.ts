import { Inject, Injectable } from "@nestjs/common";
import type {
  InventoryBucket as PrismaInventoryBucket,
  InventoryInventoryMovement,
  InventoryMovementType as PrismaInventoryMovementType,
  InventoryPurchaseReceipt,
  InventoryPurchaseReceiptItem,
  InventoryProduct,
  InventoryProductSupplier,
  InventoryReservation,
  InventoryStockLock,
  InventorySupplier,
  InventorySupplierRequest,
  InventorySupplierRequestItem,
  InventoryWarehouse,
  Prisma,
  ProductUnit as PrismaProductUnit,
  ReservationStatus as PrismaReservationStatus,
  StockLockStatus as PrismaStockLockStatus,
  SupplierRequestStatus as PrismaSupplierRequestStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  InventoryBucketStatus,
  InventoryMovementType,
  ProductUnit,
  ReservationStatus,
  StockLockStatus,
  SupplierRequestStatus
} from "../transactional/shared/status.contract";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import {
  from_prisma_enum,
  to_decimal_string,
  to_iso_datetime,
  to_prisma_enum
} from "../read-side/shared/prisma-read.mapper";

const api_product_unit_by_prisma: Record<PrismaProductUnit, ProductUnit> = {
  PIECE: "шт",
  SQUARE_METER: "кв.м",
  LINEAR_METER: "п.м",
  SERVICE: "услуга"
};

const prisma_product_unit_by_api: Record<ProductUnit, PrismaProductUnit> = {
  "шт": "PIECE",
  "кв.м": "SQUARE_METER",
  "п.м": "LINEAR_METER",
  "услуга": "SERVICE"
};

export interface SupplierReadModel {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReadModel {
  id: string;
  sku: string;
  name: string;
  unit: ProductUnit;
}

export interface ProductSupplierReadModel {
  id: string;
  productId: string;
  supplierId: string;
  supplierPriority: number;
  basePurchasePrice: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierReadModel;
}

export interface OrderReadModel {
  id: string;
  orderNumber: string;
  isDeleted: boolean;
}

export interface WarehouseReadModel {
  id: string;
  name: string;
}

export interface SupplierRequestSupplierReadModel {
  id: string;
  name: string;
}

export interface SupplierRequestItemReadModel {
  id: string;
  productId: string;
  quantity: string;
  unit: ProductUnit;
  sourceLineRef: string;
  sourceLineContext: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierRequestReadModel {
  id: string;
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  status: SupplierRequestStatus;
  expectedSupplyDate: string;
  requestedBy: string;
  confirmedBy: string | null;
  paidBy: string | null;
  paidAt: string | null;
  stockedBy: string | null;
  stockedAt: string | null;
  supplierDocumentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierReadModel;
  items: SupplierRequestItemReadModel[];
}

export interface SupplierRequestListReadModel {
  id: string;
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  status: SupplierRequestStatus;
  expectedSupplyDate: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierReadModel;
  itemsCount: number;
}

export interface PurchaseReceiptSupplierRequestReadModel {
  id: string;
  status: SupplierRequestStatus;
}

export interface PurchaseReceiptItemReadModel {
  id: string;
  productId: string;
  quantity: string;
  unit: ProductUnit;
  unitCost: string;
  lineTotal: string;
  supplierRequestItemId: string | null;
  requestedQuantity: string | null;
}

export interface PurchaseReceiptDiscrepancyLineReadModel {
  supplierRequestItemId: string | null;
  productId: string;
  unit: ProductUnit;
  requestedQuantity: string;
  receivedQuantity: string;
  discrepancyQuantity: string;
}

export interface PurchaseReceiptDiscrepancyReadModel {
  hasDiscrepancy: boolean;
  lines: PurchaseReceiptDiscrepancyLineReadModel[];
}

export interface PurchaseReceiptReadModel {
  id: string;
  receiptNumber: string;
  warehouseId: string;
  supplierId: string;
  supplierRequestId: string | null;
  receivedAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierReadModel;
  warehouse: WarehouseReadModel;
  supplierRequest: PurchaseReceiptSupplierRequestReadModel | null;
  items: PurchaseReceiptItemReadModel[];
  discrepancy: PurchaseReceiptDiscrepancyReadModel;
}

export interface PurchaseReceiptListReadModel {
  id: string;
  receiptNumber: string;
  warehouseId: string;
  supplierId: string;
  supplierRequestId: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRequestSupplierReadModel;
  warehouse: WarehouseReadModel;
  hasDiscrepancy: boolean;
}

export interface StockLockReadModel {
  id: string;
  productId: string;
  warehouseId: string;
  orderId: string | null;
  dealId: string | null;
  quantity: string;
  status: StockLockStatus;
  idempotencyKey: string | null;
  expiresAt: string;
  releasedAt: string | null;
  promotedReservationId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  product: ProductReadModel;
  warehouse: WarehouseReadModel;
}

export interface StockLockListReadModel {
  id: string;
  productId: string;
  warehouseId: string;
  orderId: string | null;
  dealId: string | null;
  quantity: string;
  status: StockLockStatus;
  expiresAt: string;
  releasedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  product: ProductReadModel;
  warehouse: WarehouseReadModel;
}

export interface ReservationOrderReadModel {
  id: string;
  orderNumber: string;
}

export interface ReservationReadModel {
  id: string;
  orderId: string;
  productId: string;
  warehouseId: string;
  quantity: string;
  status: ReservationStatus;
  expiresAt: string;
  releasedAt: string | null;
  consumedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  order: ReservationOrderReadModel;
  product: ProductReadModel;
  warehouse: WarehouseReadModel;
}

export interface InventoryMovementReadModel {
  id: string;
  movementType: InventoryMovementType;
  productId: string;
  warehouseId: string;
  quantity: string;
  bucketFrom: InventoryBucketStatus | null;
  bucketTo: InventoryBucketStatus | null;
  unitCost: string | null;
  totalCost: string | null;
  orderId: string | null;
  returnRequestId: string | null;
  reservationId: string | null;
  purchaseReceiptId: string | null;
  reason: string | null;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
  product: ProductReadModel;
  warehouse: WarehouseReadModel;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface CreateProductSupplierInput {
  productId: string;
  supplierId: string;
  supplierPriority: number;
  basePurchasePrice: string;
  currency: string;
  isActive: boolean;
}

export interface UpdateProductSupplierInput {
  supplierPriority?: number;
  basePurchasePrice?: string;
  currency?: string;
  isActive?: boolean;
}

export interface CreateSupplierRequestItemInput {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  sourceLineRef: string;
  sourceLineContext?: unknown;
}

export interface CreateSupplierRequestInput {
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  status: SupplierRequestStatus;
  expectedSupplyDate: string;
  requestedBy: string;
  items: CreateSupplierRequestItemInput[];
}

export interface CreatePurchaseReceiptItemInput {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  unitCost: string;
  supplierRequestItemId: string;
}

export interface CreatePurchaseReceiptInput {
  receiptNumber: string;
  warehouseId: string;
  supplierId: string;
  supplierRequestId: string;
  receivedAt: string;
  createdBy: string;
  items: CreatePurchaseReceiptItemInput[];
}

export interface CreateStockLockInput {
  productId: string;
  warehouseId: string;
  dealId: string;
  quantity: number;
  status: StockLockStatus;
  expiresAt: string;
  idempotencyKey?: string | null;
  createdBy: string;
}

export interface UpdateStockLockInput {
  status?: StockLockStatus;
  releasedAt?: string | null;
}

export interface CreateReservationInput {
  orderId: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdBy: string;
}

export interface UpdateReservationInput {
  status?: ReservationStatus;
  releasedAt?: string | null;
  consumedAt?: string | null;
}

export interface CreateInventoryMovementInput {
  movementType: InventoryMovementType;
  productId: string;
  warehouseId: string;
  quantity: number;
  bucketFrom?: InventoryBucketStatus | null;
  bucketTo?: InventoryBucketStatus | null;
  unitCost?: string | null;
  totalCost?: string | null;
  orderId?: string | null;
  returnRequestId?: string | null;
  reservationId?: string | null;
  purchaseReceiptId?: string | null;
  reason?: string | null;
  performedBy: string;
}

export interface UpdateSupplierRequestInput {
  status?: SupplierRequestStatus;
  expectedSupplyDate?: string;
  confirmedBy?: string | null;
  paidBy?: string | null;
  paidAt?: string;
  stockedBy?: string | null;
  stockedAt?: string;
}

type SupplierRequestWithItemsRecord = InventorySupplierRequest & {
  supplier: InventorySupplier;
  items: InventorySupplierRequestItem[];
};

type ProductSupplierWithSupplierRecord = InventoryProductSupplier & {
  supplier: InventorySupplier;
};

type SupplierRequestWithCountRecord = InventorySupplierRequest & {
  supplier: InventorySupplier;
  _count: {
    items: number;
  };
};

type PurchaseReceiptSupplierRequestRecord = InventorySupplierRequest & {
  items: InventorySupplierRequestItem[];
};

type PurchaseReceiptWithItemsRecord = InventoryPurchaseReceipt & {
  supplier: InventorySupplier;
  warehouse: InventoryWarehouse;
  supplierRequest: PurchaseReceiptSupplierRequestRecord | null;
  items: InventoryPurchaseReceiptItem[];
};

type StockLockWithRelationsRecord = InventoryStockLock & {
  product: InventoryProduct;
  warehouse: InventoryWarehouse;
};

type ReservationWithRelationsRecord = InventoryReservation & {
  order: {
    id: string;
    orderNumber: string;
  };
  product: InventoryProduct;
  warehouse: InventoryWarehouse;
};

type InventoryMovementWithRelationsRecord = InventoryInventoryMovement & {
  product: InventoryProduct;
  warehouse: InventoryWarehouse;
};

function to_iso_date(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function to_decimal_number(value: { toString: () => string } | null | undefined): number {
  const normalized = to_decimal_string(value);
  return normalized ? Number(normalized) : 0;
}

function is_same_quantity(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0005;
}

function format_quantity(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function build_product_unit_key(productId: string, unit: PrismaProductUnit): string {
  return `${productId}:${unit}`;
}

function map_supplier_record(record: InventorySupplier): SupplierReadModel {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    email: record.email,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_product_record(record: InventoryProduct): ProductReadModel {
  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    unit: api_product_unit_by_prisma[record.unit]
  };
}

function map_product_supplier_record(
  record: ProductSupplierWithSupplierRecord,
  includeBasePurchasePrice: boolean
): ProductSupplierReadModel {
  return {
    id: record.id,
    productId: record.productId,
    supplierId: record.supplierId,
    supplierPriority: record.supplierPriority,
    basePurchasePrice: includeBasePurchasePrice
      ? (to_decimal_string(record.basePurchasePrice) ?? "0")
      : null,
    currency: record.currency,
    isActive: record.isActive,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    supplier: {
      id: record.supplier.id,
      name: record.supplier.name
    }
  };
}

function map_warehouse_record(record: InventoryWarehouse): WarehouseReadModel {
  return {
    id: record.id,
    name: record.name
  };
}

function map_supplier_request_item_record(
  record: InventorySupplierRequestItem
): SupplierRequestItemReadModel {
  return {
    id: record.id,
    productId: record.productId,
    quantity: to_decimal_string(record.qty) ?? "0",
    unit: api_product_unit_by_prisma[record.unit],
    sourceLineRef: record.sourceLineRef,
    sourceLineContext: (record.sourceLineContext ?? null) as Record<string, unknown> | null,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_supplier_request_list_record(
  record: SupplierRequestWithCountRecord
): SupplierRequestListReadModel {
  return {
    id: record.id,
    supplierId: record.supplierId,
    businessSourceType: record.businessSourceType as "deal" | "order",
    businessSourceId: record.businessSourceId,
    status: from_prisma_enum(record.status) as SupplierRequestStatus,
    expectedSupplyDate: to_iso_date(record.expectedSupplyDate),
    requestedBy: record.requestedBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    supplier: {
      id: record.supplier.id,
      name: record.supplier.name
    },
    itemsCount: record._count.items
  };
}

function map_supplier_request_detail_record(
  record: SupplierRequestWithItemsRecord
): SupplierRequestReadModel {
  return {
    id: record.id,
    supplierId: record.supplierId,
    businessSourceType: record.businessSourceType as "deal" | "order",
    businessSourceId: record.businessSourceId,
    status: from_prisma_enum(record.status) as SupplierRequestStatus,
    expectedSupplyDate: to_iso_date(record.expectedSupplyDate),
    requestedBy: record.requestedBy,
    confirmedBy: record.confirmedBy,
    paidBy: record.paidBy,
    paidAt: to_iso_datetime(record.paidAt),
    stockedBy: record.stockedBy,
    stockedAt: to_iso_datetime(record.stockedAt),
    supplierDocumentUrl: record.supplierDocumentUrl,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    supplier: {
      id: record.supplier.id,
      name: record.supplier.name
    },
    items: record.items.map(map_supplier_request_item_record)
  };
}

function build_purchase_receipt_requested_quantity_map(
  supplierRequestItems: InventorySupplierRequestItem[] | null
): Map<string, string> {
  if (!supplierRequestItems) {
    return new Map<string, string>();
  }

  return new Map(
    supplierRequestItems.map((supplierRequestItem) => [
      supplierRequestItem.id,
      to_decimal_string(supplierRequestItem.qty) ?? "0"
    ])
  );
}

function map_purchase_receipt_item_record(
  record: InventoryPurchaseReceiptItem,
  requestedQuantityByRequestItemId: Map<string, string>
): PurchaseReceiptItemReadModel {
  const requestedQuantity = record.supplierRequestItemId
    ? (requestedQuantityByRequestItemId.get(record.supplierRequestItemId) ?? null)
    : null;

  return {
    id: record.id,
    productId: record.productId,
    quantity: to_decimal_string(record.qty) ?? "0",
    unit: api_product_unit_by_prisma[record.unit],
    unitCost: to_decimal_string(record.unitCost) ?? "0",
    lineTotal: to_decimal_string(record.lineTotal) ?? "0",
    supplierRequestItemId: record.supplierRequestItemId,
    requestedQuantity
  };
}

function build_purchase_receipt_discrepancy(
  supplierRequestItems: InventorySupplierRequestItem[] | null,
  receiptItems: InventoryPurchaseReceiptItem[]
): PurchaseReceiptDiscrepancyReadModel {
  if (!supplierRequestItems || supplierRequestItems.length === 0) {
    return {
      hasDiscrepancy: false,
      lines: []
    };
  }

  const supplierRequestItemsById = new Map(
    supplierRequestItems.map((supplierRequestItem) => [supplierRequestItem.id, supplierRequestItem])
  );

  const receivedBySupplierRequestItemId = new Map<string, number>();
  const unmatchedLinesByKey = new Map<
    string,
    {
      supplierRequestItemId: string | null;
      productId: string;
      unit: PrismaProductUnit;
      receivedQuantity: number;
    }
  >();

  for (const receiptItem of receiptItems) {
    const receivedQuantity = to_decimal_number(receiptItem.qty);

    if (receiptItem.supplierRequestItemId && supplierRequestItemsById.has(receiptItem.supplierRequestItemId)) {
      const existing = receivedBySupplierRequestItemId.get(receiptItem.supplierRequestItemId) ?? 0;
      receivedBySupplierRequestItemId.set(
        receiptItem.supplierRequestItemId,
        existing + receivedQuantity
      );
      continue;
    }

    const key = receiptItem.supplierRequestItemId
      ? `linked:${receiptItem.supplierRequestItemId}`
      : `unlinked:${build_product_unit_key(receiptItem.productId, receiptItem.unit)}`;
    const existingUnmatched = unmatchedLinesByKey.get(key);

    if (existingUnmatched) {
      existingUnmatched.receivedQuantity += receivedQuantity;
      continue;
    }

    unmatchedLinesByKey.set(key, {
      supplierRequestItemId: receiptItem.supplierRequestItemId,
      productId: receiptItem.productId,
      unit: receiptItem.unit,
      receivedQuantity
    });
  }

  const lines: PurchaseReceiptDiscrepancyLineReadModel[] = [];

  for (const supplierRequestItem of supplierRequestItems) {
    const requestedQuantity = to_decimal_number(supplierRequestItem.qty);
    const receivedQuantity =
      receivedBySupplierRequestItemId.get(supplierRequestItem.id) ?? 0;

    if (is_same_quantity(requestedQuantity, receivedQuantity)) {
      continue;
    }

    lines.push({
      supplierRequestItemId: supplierRequestItem.id,
      productId: supplierRequestItem.productId,
      unit: api_product_unit_by_prisma[supplierRequestItem.unit],
      requestedQuantity: format_quantity(requestedQuantity),
      receivedQuantity: format_quantity(receivedQuantity),
      discrepancyQuantity: format_quantity(receivedQuantity - requestedQuantity)
    });
  }

  for (const unmatchedLine of unmatchedLinesByKey.values()) {
    if (is_same_quantity(unmatchedLine.receivedQuantity, 0)) {
      continue;
    }

    lines.push({
      supplierRequestItemId: unmatchedLine.supplierRequestItemId,
      productId: unmatchedLine.productId,
      unit: api_product_unit_by_prisma[unmatchedLine.unit],
      requestedQuantity: "0",
      receivedQuantity: format_quantity(unmatchedLine.receivedQuantity),
      discrepancyQuantity: format_quantity(unmatchedLine.receivedQuantity)
    });
  }

  return {
    hasDiscrepancy: lines.length > 0,
    lines
  };
}

function map_purchase_receipt_detail_record(
  record: PurchaseReceiptWithItemsRecord
): PurchaseReceiptReadModel {
  const requestedQuantityByRequestItemId = build_purchase_receipt_requested_quantity_map(
    record.supplierRequest?.items ?? null
  );
  const discrepancy = build_purchase_receipt_discrepancy(
    record.supplierRequest?.items ?? null,
    record.items
  );

  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    warehouseId: record.warehouseId,
    supplierId: record.supplierId,
    supplierRequestId: record.supplierRequestId,
    receivedAt: to_iso_datetime(record.receivedAt) ?? "",
    createdBy: record.createdBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    supplier: {
      id: record.supplier.id,
      name: record.supplier.name
    },
    warehouse: map_warehouse_record(record.warehouse),
    supplierRequest: record.supplierRequest
      ? {
          id: record.supplierRequest.id,
          status: from_prisma_enum(record.supplierRequest.status) as SupplierRequestStatus
        }
      : null,
    items: record.items.map((item) =>
      map_purchase_receipt_item_record(item, requestedQuantityByRequestItemId)
    ),
    discrepancy
  };
}

function map_purchase_receipt_list_record(
  record: PurchaseReceiptWithItemsRecord
): PurchaseReceiptListReadModel {
  const discrepancy = build_purchase_receipt_discrepancy(
    record.supplierRequest?.items ?? null,
    record.items
  );

  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    warehouseId: record.warehouseId,
    supplierId: record.supplierId,
    supplierRequestId: record.supplierRequestId,
    receivedAt: to_iso_datetime(record.receivedAt) ?? "",
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    supplier: {
      id: record.supplier.id,
      name: record.supplier.name
    },
    warehouse: map_warehouse_record(record.warehouse),
    hasDiscrepancy: discrepancy.hasDiscrepancy
  };
}

function map_stock_lock_detail_record(record: StockLockWithRelationsRecord): StockLockReadModel {
  return {
    id: record.id,
    productId: record.productId,
    warehouseId: record.warehouseId,
    orderId: record.orderId,
    dealId: record.dealId,
    quantity: to_decimal_string(record.qty) ?? "0",
    status: from_prisma_enum(record.status) as StockLockStatus,
    idempotencyKey: record.idempotencyKey,
    expiresAt: to_iso_datetime(record.expiresAt) ?? "",
    releasedAt: to_iso_datetime(record.releasedAt),
    promotedReservationId: record.promotedReservationId,
    createdBy: record.createdBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    product: map_product_record(record.product),
    warehouse: map_warehouse_record(record.warehouse)
  };
}

function map_stock_lock_list_record(record: StockLockWithRelationsRecord): StockLockListReadModel {
  return {
    id: record.id,
    productId: record.productId,
    warehouseId: record.warehouseId,
    orderId: record.orderId,
    dealId: record.dealId,
    quantity: to_decimal_string(record.qty) ?? "0",
    status: from_prisma_enum(record.status) as StockLockStatus,
    expiresAt: to_iso_datetime(record.expiresAt) ?? "",
    releasedAt: to_iso_datetime(record.releasedAt),
    createdBy: record.createdBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    product: map_product_record(record.product),
    warehouse: map_warehouse_record(record.warehouse)
  };
}

function map_reservation_record(record: ReservationWithRelationsRecord): ReservationReadModel {
  return {
    id: record.id,
    orderId: record.orderId,
    productId: record.productId,
    warehouseId: record.warehouseId,
    quantity: to_decimal_string(record.qty) ?? "0",
    status: from_prisma_enum(record.status) as ReservationStatus,
    expiresAt: to_iso_datetime(record.expiresAt) ?? "",
    releasedAt: to_iso_datetime(record.releasedAt),
    consumedAt: to_iso_datetime(record.consumedAt),
    createdBy: record.createdBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    order: {
      id: record.order.id,
      orderNumber: record.order.orderNumber
    },
    product: map_product_record(record.product),
    warehouse: map_warehouse_record(record.warehouse)
  };
}

function map_inventory_movement_record(
  record: InventoryMovementWithRelationsRecord
): InventoryMovementReadModel {
  return {
    id: record.id,
    movementType: from_prisma_enum(record.movementType) as InventoryMovementType,
    productId: record.productId,
    warehouseId: record.warehouseId,
    quantity: to_decimal_string(record.qty) ?? "0",
    bucketFrom: record.bucketFrom
      ? (from_prisma_enum(record.bucketFrom) as InventoryBucketStatus)
      : null,
    bucketTo: record.bucketTo ? (from_prisma_enum(record.bucketTo) as InventoryBucketStatus) : null,
    unitCost: to_decimal_string(record.unitCost),
    totalCost: to_decimal_string(record.totalCost),
    orderId: record.orderId,
    returnRequestId: record.returnRequestId,
    reservationId: record.reservationId,
    purchaseReceiptId: record.purchaseReceiptId,
    reason: record.reason,
    performedBy: record.performedBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    product: map_product_record(record.product),
    warehouse: map_warehouse_record(record.warehouse)
  };
}

@Injectable()
export class PrismaSupplyRepository {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listSuppliers(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<SupplierReadModel>> {
    const where: Prisma.InventorySupplierWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } }
      ];
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventorySupplierOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventorySupplier.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.inventorySupplier.count({ where })
    ]);

    return {
      items: items.map(map_supplier_record),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getSupplierById(supplierId: string): Promise<SupplierReadModel | null> {
    const supplier = await this.prismaService.inventorySupplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return null;
    }

    return map_supplier_record(supplier);
  }

  async getProductById(productId: string): Promise<ProductReadModel | null> {
    const product = await this.prismaService.inventoryProduct.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return null;
    }

    return map_product_record(product);
  }

  async getDealById(dealId: string): Promise<{ id: string } | null> {
    const deal = await this.prismaService.crmDeal.findUnique({
      where: { id: dealId },
      select: {
        id: true
      }
    });

    if (!deal) {
      return null;
    }

    return {
      id: deal.id
    };
  }

  async getOrderById(orderId: string): Promise<OrderReadModel | null> {
    const order = await this.prismaService.ordersOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        isDeleted: true
      }
    });

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      isDeleted: order.isDeleted
    };
  }

  async getWarehouseById(warehouseId: string): Promise<WarehouseReadModel | null> {
    const warehouse = await this.prismaService.inventoryWarehouse.findUnique({
      where: { id: warehouseId },
      select: {
        id: true,
        name: true
      }
    });

    if (!warehouse) {
      return null;
    }

    return {
      id: warehouse.id,
      name: warehouse.name
    };
  }

  async createSupplier(input: CreateSupplierInput): Promise<SupplierReadModel> {
    const created = await this.prismaService.inventorySupplier.create({
      data: {
        name: input.name,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {})
      }
    });

    return map_supplier_record(created);
  }

  async listProductSuppliers(
    productId: string,
    includeBasePurchasePrice: boolean
  ): Promise<ProductSupplierReadModel[]> {
    const productSuppliers = await this.prismaService.inventoryProductSupplier.findMany({
      where: { productId },
      orderBy: [{ supplierPriority: "asc" }, { createdAt: "asc" }],
      include: {
        supplier: true
      }
    });

    return productSuppliers.map((productSupplier) =>
      map_product_supplier_record(
        productSupplier as ProductSupplierWithSupplierRecord,
        includeBasePurchasePrice
      )
    );
  }

  async getProductSupplierById(
    productSupplierId: string,
    includeBasePurchasePrice: boolean
  ): Promise<ProductSupplierReadModel | null> {
    const productSupplier = await this.prismaService.inventoryProductSupplier.findUnique({
      where: { id: productSupplierId },
      include: {
        supplier: true
      }
    });

    if (!productSupplier) {
      return null;
    }

    return map_product_supplier_record(
      productSupplier as ProductSupplierWithSupplierRecord,
      includeBasePurchasePrice
    );
  }

  async createProductSupplier(input: CreateProductSupplierInput): Promise<ProductSupplierReadModel> {
    const created = await this.prismaService.inventoryProductSupplier.create({
      data: {
        productId: input.productId,
        supplierId: input.supplierId,
        supplierPriority: input.supplierPriority,
        basePurchasePrice: input.basePurchasePrice,
        currency: input.currency,
        isActive: input.isActive
      },
      include: {
        supplier: true
      }
    });

    return map_product_supplier_record(
      created as ProductSupplierWithSupplierRecord,
      true
    );
  }

  async updateProductSupplierById(
    productSupplierId: string,
    input: UpdateProductSupplierInput
  ): Promise<ProductSupplierReadModel> {
    const updated = await this.prismaService.inventoryProductSupplier.update({
      where: { id: productSupplierId },
      data: {
        ...(input.supplierPriority !== undefined
          ? { supplierPriority: input.supplierPriority }
          : {}),
        ...(input.basePurchasePrice !== undefined
          ? { basePurchasePrice: input.basePurchasePrice }
          : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      },
      include: {
        supplier: true
      }
    });

    return map_product_supplier_record(
      updated as ProductSupplierWithSupplierRecord,
      true
    );
  }

  async listSupplierRequests(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<SupplierRequestListReadModel>> {
    const where: Prisma.InventorySupplierRequestWhereInput = {};

    if (query.search) {
      where.OR = [
        { businessSourceType: { contains: query.search, mode: "insensitive" } },
        { supplier: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mappedStatuses = query.status.map((status) =>
        to_prisma_enum<PrismaSupplierRequestStatus>(status)
      );
      const [firstStatus] = mappedStatuses;
      if (mappedStatuses.length === 1 && firstStatus) {
        where.status = firstStatus;
      } else {
        where.status = { in: mappedStatuses };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventorySupplierRequestOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventorySupplierRequest.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              items: true
            }
          }
        }
      }),
      this.prismaService.inventorySupplierRequest.count({ where })
    ]);

    return {
      items: items.map((item) =>
        map_supplier_request_list_record(item as SupplierRequestWithCountRecord)
      ),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getSupplierRequestById(
    supplierRequestId: string
  ): Promise<SupplierRequestReadModel | null> {
    const supplierRequest = await this.prismaService.inventorySupplierRequest.findUnique({
      where: { id: supplierRequestId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!supplierRequest) {
      return null;
    }

    return map_supplier_request_detail_record(supplierRequest as SupplierRequestWithItemsRecord);
  }

  async updateSupplierRequestById(
    supplierRequestId: string,
    input: UpdateSupplierRequestInput
  ): Promise<SupplierRequestReadModel> {
    const updated = await this.prismaService.inventorySupplierRequest.update({
      where: { id: supplierRequestId },
      data: {
        ...(input.status !== undefined
          ? { status: to_prisma_enum<PrismaSupplierRequestStatus>(input.status) }
          : {}),
        ...(input.expectedSupplyDate !== undefined
          ? { expectedSupplyDate: new Date(input.expectedSupplyDate) }
          : {}),
        ...(input.confirmedBy !== undefined ? { confirmedBy: input.confirmedBy } : {}),
        ...(input.paidBy !== undefined ? { paidBy: input.paidBy } : {}),
        ...(input.paidAt !== undefined ? { paidAt: new Date(input.paidAt) } : {}),
        ...(input.stockedBy !== undefined ? { stockedBy: input.stockedBy } : {}),
        ...(input.stockedAt !== undefined ? { stockedAt: new Date(input.stockedAt) } : {})
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    return map_supplier_request_detail_record(updated as SupplierRequestWithItemsRecord);
  }

  async createSupplierRequest(input: CreateSupplierRequestInput): Promise<SupplierRequestReadModel> {
    const created = await this.prismaService.inventorySupplierRequest.create({
      data: {
        supplierId: input.supplierId,
        businessSourceType: input.businessSourceType,
        businessSourceId: input.businessSourceId,
        status: to_prisma_enum<PrismaSupplierRequestStatus>(input.status),
        expectedSupplyDate: new Date(input.expectedSupplyDate),
        requestedBy: input.requestedBy,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            qty: item.quantity,
            unit: prisma_product_unit_by_api[item.unit],
            sourceLineRef: item.sourceLineRef,
            ...(item.sourceLineContext !== undefined
              ? { sourceLineContext: item.sourceLineContext as Prisma.InputJsonValue }
              : {})
          }))
        }
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    return map_supplier_request_detail_record(created as SupplierRequestWithItemsRecord);
  }

  async listPurchaseReceipts(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<PurchaseReceiptListReadModel>> {
    const where: Prisma.InventoryPurchaseReceiptWhereInput = {};

    if (query.search) {
      where.OR = [
        { receiptNumber: { contains: query.search, mode: "insensitive" } },
        { supplier: { name: { contains: query.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventoryPurchaseReceiptOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventoryPurchaseReceipt.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          supplier: {
            select: {
              id: true,
              name: true
            }
          },
          warehouse: {
            select: {
              id: true,
              name: true
            }
          },
          supplierRequest: {
            include: {
              items: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          },
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      }),
      this.prismaService.inventoryPurchaseReceipt.count({ where })
    ]);

    return {
      items: items.map((item) =>
        map_purchase_receipt_list_record(item as PurchaseReceiptWithItemsRecord)
      ),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getPurchaseReceiptById(
    purchaseReceiptId: string
  ): Promise<PurchaseReceiptReadModel | null> {
    const purchaseReceipt = await this.prismaService.inventoryPurchaseReceipt.findUnique({
      where: { id: purchaseReceiptId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true
          }
        },
        supplierRequest: {
          include: {
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        },
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!purchaseReceipt) {
      return null;
    }

    return map_purchase_receipt_detail_record(purchaseReceipt as PurchaseReceiptWithItemsRecord);
  }

  async createPurchaseReceipt(input: CreatePurchaseReceiptInput): Promise<PurchaseReceiptReadModel> {
    const created = await this.prismaService.inventoryPurchaseReceipt.create({
      data: {
        receiptNumber: input.receiptNumber,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
        supplierRequestId: input.supplierRequestId,
        receivedAt: new Date(input.receivedAt),
        createdBy: input.createdBy,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            qty: item.quantity.toFixed(3),
            unit: prisma_product_unit_by_api[item.unit],
            unitCost: item.unitCost,
            lineTotal: (item.quantity * Number(item.unitCost)).toFixed(2),
            supplierRequestItemId: item.supplierRequestItemId
          }))
        }
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true
          }
        },
        supplierRequest: {
          include: {
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        },
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    return map_purchase_receipt_detail_record(created as PurchaseReceiptWithItemsRecord);
  }

  async listStockLocks(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<StockLockListReadModel>> {
    const where: Prisma.InventoryStockLockWhereInput = {};

    if (query.search) {
      where.OR = [
        { product: { sku: { contains: query.search, mode: "insensitive" } } },
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mappedStatuses = query.status.map((status) =>
        to_prisma_enum<PrismaStockLockStatus>(status)
      );
      const [firstStatus] = mappedStatuses;
      if (mappedStatuses.length === 1 && firstStatus) {
        where.status = firstStatus;
      } else {
        where.status = { in: mappedStatuses };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventoryStockLockOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventoryStockLock.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: true,
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prismaService.inventoryStockLock.count({ where })
    ]);

    return {
      items: items.map((item) => map_stock_lock_list_record(item as StockLockWithRelationsRecord)),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getStockLockById(stockLockId: string): Promise<StockLockReadModel | null> {
    const stockLock = await this.prismaService.inventoryStockLock.findUnique({
      where: { id: stockLockId },
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!stockLock) {
      return null;
    }

    return map_stock_lock_detail_record(stockLock as StockLockWithRelationsRecord);
  }

  async createStockLock(input: CreateStockLockInput): Promise<StockLockReadModel> {
    const created = await this.prismaService.inventoryStockLock.create({
      data: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        dealId: input.dealId,
        qty: input.quantity.toFixed(3),
        status: to_prisma_enum<PrismaStockLockStatus>(input.status),
        expiresAt: new Date(input.expiresAt),
        ...(input.idempotencyKey !== undefined ? { idempotencyKey: input.idempotencyKey } : {}),
        createdBy: input.createdBy
      },
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return map_stock_lock_detail_record(created as StockLockWithRelationsRecord);
  }

  async updateStockLockById(
    stockLockId: string,
    input: UpdateStockLockInput
  ): Promise<StockLockReadModel> {
    const updated = await this.prismaService.inventoryStockLock.update({
      where: { id: stockLockId },
      data: {
        ...(input.status !== undefined
          ? { status: to_prisma_enum<PrismaStockLockStatus>(input.status) }
          : {}),
        ...(input.releasedAt !== undefined
          ? { releasedAt: input.releasedAt ? new Date(input.releasedAt) : null }
          : {})
      },
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return map_stock_lock_detail_record(updated as StockLockWithRelationsRecord);
  }

  async listReservations(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<ReservationReadModel>> {
    const where: Prisma.InventoryReservationWhereInput = {};

    if (query.search) {
      where.OR = [
        { order: { orderNumber: { contains: query.search, mode: "insensitive" } } },
        { product: { sku: { contains: query.search, mode: "insensitive" } } },
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: query.search, mode: "insensitive" } } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const mappedStatuses = query.status.map((status) =>
        to_prisma_enum<PrismaReservationStatus>(status)
      );
      const [firstStatus] = mappedStatuses;
      if (mappedStatuses.length === 1 && firstStatus) {
        where.status = firstStatus;
      } else {
        where.status = { in: mappedStatuses };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventoryReservationOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventoryReservation.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true
            }
          },
          product: true,
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prismaService.inventoryReservation.count({ where })
    ]);

    return {
      items: items.map((item) => map_reservation_record(item as ReservationWithRelationsRecord)),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getReservationById(reservationId: string): Promise<ReservationReadModel | null> {
    const reservation = await this.prismaService.inventoryReservation.findUnique({
      where: { id: reservationId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!reservation) {
      return null;
    }

    return map_reservation_record(reservation as ReservationWithRelationsRecord);
  }

  async createReservations(input: CreateReservationInput[]): Promise<ReservationReadModel[]> {
    const created = await this.prismaService.$transaction(
      input.map((reservationLine) =>
        this.prismaService.inventoryReservation.create({
          data: {
            orderId: reservationLine.orderId,
            productId: reservationLine.productId,
            warehouseId: reservationLine.warehouseId,
            qty: reservationLine.quantity.toFixed(3),
            status: to_prisma_enum<PrismaReservationStatus>(reservationLine.status),
            expiresAt: new Date(reservationLine.expiresAt),
            createdBy: reservationLine.createdBy
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true
              }
            },
            product: true,
            warehouse: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
      )
    );

    return created.map((item) => map_reservation_record(item as ReservationWithRelationsRecord));
  }

  async updateReservationById(
    reservationId: string,
    input: UpdateReservationInput
  ): Promise<ReservationReadModel> {
    const updated = await this.prismaService.inventoryReservation.update({
      where: { id: reservationId },
      data: {
        ...(input.status !== undefined
          ? { status: to_prisma_enum<PrismaReservationStatus>(input.status) }
          : {}),
        ...(input.releasedAt !== undefined
          ? { releasedAt: input.releasedAt ? new Date(input.releasedAt) : null }
          : {}),
        ...(input.consumedAt !== undefined
          ? { consumedAt: input.consumedAt ? new Date(input.consumedAt) : null }
          : {})
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true
          }
        },
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return map_reservation_record(updated as ReservationWithRelationsRecord);
  }

  async listInventoryMovements(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<InventoryMovementReadModel>> {
    const where: Prisma.InventoryInventoryMovementWhereInput = {};

    if (query.search) {
      where.OR = [
        { product: { sku: { contains: query.search, mode: "insensitive" } } },
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { warehouse: { name: { contains: query.search, mode: "insensitive" } } },
        { reason: { contains: query.search, mode: "insensitive" } }
      ];
    }

    if (query.status && query.status.length > 0) {
      const movementTypes = query.status.map((status) =>
        to_prisma_enum<PrismaInventoryMovementType>(status)
      );
      const [firstMovementType] = movementTypes;
      if (movementTypes.length === 1 && firstMovementType) {
        where.movementType = firstMovementType;
      } else {
        where.movementType = { in: movementTypes };
      }
    }

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.InventoryInventoryMovementOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.inventoryInventoryMovement.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: true,
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prismaService.inventoryInventoryMovement.count({ where })
    ]);

    return {
      items: items.map((item) =>
        map_inventory_movement_record(item as InventoryMovementWithRelationsRecord)
      ),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getInventoryMovementById(
    inventoryMovementId: string
  ): Promise<InventoryMovementReadModel | null> {
    const movement = await this.prismaService.inventoryInventoryMovement.findUnique({
      where: { id: inventoryMovementId },
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!movement) {
      return null;
    }

    return map_inventory_movement_record(movement as InventoryMovementWithRelationsRecord);
  }

  async createInventoryMovement(
    input: CreateInventoryMovementInput
  ): Promise<InventoryMovementReadModel> {
    const created = await this.prismaService.inventoryInventoryMovement.create({
      data: {
        movementType: to_prisma_enum<PrismaInventoryMovementType>(input.movementType),
        productId: input.productId,
        warehouseId: input.warehouseId,
        qty: input.quantity.toFixed(3),
        ...(input.bucketFrom !== undefined
          ? {
              bucketFrom: input.bucketFrom
                ? to_prisma_enum<PrismaInventoryBucket>(input.bucketFrom)
                : null
            }
          : {}),
        ...(input.bucketTo !== undefined
          ? {
              bucketTo: input.bucketTo
                ? to_prisma_enum<PrismaInventoryBucket>(input.bucketTo)
                : null
            }
          : {}),
        ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
        ...(input.totalCost !== undefined ? { totalCost: input.totalCost } : {}),
        ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
        ...(input.returnRequestId !== undefined ? { returnRequestId: input.returnRequestId } : {}),
        ...(input.reservationId !== undefined ? { reservationId: input.reservationId } : {}),
        ...(input.purchaseReceiptId !== undefined
          ? { purchaseReceiptId: input.purchaseReceiptId }
          : {}),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
        performedBy: input.performedBy
      },
      include: {
        product: true,
        warehouse: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return map_inventory_movement_record(created as InventoryMovementWithRelationsRecord);
  }
}
