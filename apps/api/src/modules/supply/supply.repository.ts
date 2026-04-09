import { Inject, Injectable } from "@nestjs/common";
import type {
  InventorySupplier,
  InventorySupplierRequest,
  InventorySupplierRequestItem,
  Prisma,
  ProductUnit as PrismaProductUnit,
  SupplierRequestStatus as PrismaSupplierRequestStatus
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  ProductUnit,
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

export interface CreateSupplierInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
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

type SupplierRequestWithCountRecord = InventorySupplierRequest & {
  supplier: InventorySupplier;
  _count: {
    items: number;
  };
};

function to_iso_date(value: Date): string {
  return value.toISOString().slice(0, 10);
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
}
