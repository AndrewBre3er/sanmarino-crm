import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { AuthPrincipal } from "../auth/auth.contract";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";
import type {
  ProductUnit,
  StockLockStatus,
  SupplierRequestStatus
} from "../transactional/shared/status.contract";
import { StatusTransitionError } from "../transactional/shared/transition.guard";
import { assert_supplier_request_status_transition } from "./supplier-request.transition.guard";
import {
  PrismaSupplyRepository,
  type CreateReservationInput,
  type CreatePurchaseReceiptInput,
  type CreateStockLockInput,
  type CreateSupplierInput,
  type CreateSupplierRequestInput,
  type PurchaseReceiptReadModel,
  type ReservationReadModel,
  type StockLockListReadModel,
  type StockLockReadModel,
  type SupplierRequestItemReadModel,
  type SupplierRequestReadModel
} from "./supply.repository";

const supplier_write_role_codes = new Set(["seller", "admin", "ceo"] as const);
const supplier_request_create_role_codes = new Set(["seller"] as const);
const supplier_request_confirm_role_codes = new Set(["seller"] as const);
const supplier_request_paid_role_codes = new Set(["finance", "ceo"] as const);
const supplier_request_stocked_role_codes = new Set(["warehouse"] as const);
const purchase_receipt_create_role_codes = new Set(["warehouse"] as const);
const stock_lock_create_role_codes = new Set(["seller"] as const);
const stock_lock_release_role_codes = new Set(["seller"] as const);
const supplier_request_business_source_types = ["deal", "order"] as const;
const supplier_request_file_role_codes = new Set(["warehouse", "finance", "ceo"] as const);
const stock_lock_ttl_default_minutes = 10;
const stock_lock_ttl_min_minutes = 5;
const stock_lock_ttl_max_minutes = 10;

export interface CreateSupplierPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface CreateSupplierRequestItemPayload {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  sourceLineRef: string;
  sourceLineContext?: Record<string, unknown>;
}

export interface CreateSupplierRequestPayload {
  supplierId: string;
  businessSourceType: "deal" | "order";
  businessSourceId: string;
  expectedSupplyDate: string;
  items: CreateSupplierRequestItemPayload[];
}

export interface CreatePurchaseReceiptItemPayload {
  productId: string;
  quantity: number;
  unit: ProductUnit;
  unitCost: string;
  supplierRequestItemId?: string;
}

export interface CreatePurchaseReceiptPayload {
  warehouseId: string;
  supplierId: string;
  supplierRequestId: string;
  receivedAt: string;
  items: CreatePurchaseReceiptItemPayload[];
}

export interface CreateStockLockPayload {
  productId: string;
  warehouseId: string;
  dealId: string;
  quantity: number;
  ttlMinutes?: number;
  idempotencyKey?: string;
}

export interface CreateReservationItemPayload {
  productId: string;
  quantity: number;
  expiresAt: string;
}

export interface CreateReservationsForOrderPayload {
  orderId: string;
  warehouseId: string;
  items: CreateReservationItemPayload[];
}

export interface ConfirmSupplierRequestBySupplierPayload {
  expectedSupplyDate: string;
}

@Injectable()
export class SupplyService {
  constructor(
    @Inject(PrismaSupplyRepository)
    private readonly supplyRepository: PrismaSupplyRepository
  ) {}

  async listSuppliers(query: ReadCollectionQueryInput) {
    return this.supplyRepository.listSuppliers(query);
  }

  async getSupplier(supplierId: string) {
    const supplier = await this.supplyRepository.getSupplierById(supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier '${supplierId}' was not found`);
    }

    return supplier;
  }

  async createSupplier(input: CreateSupplierPayload, actor: AuthPrincipal) {
    this.assert_supplier_write_access(actor);
    const createInput = this.to_create_supplier_input(input);
    return this.supplyRepository.createSupplier(createInput);
  }

  async listSupplierRequests(query: ReadCollectionQueryInput) {
    return this.supplyRepository.listSupplierRequests(query);
  }

  async getSupplierRequest(supplierRequestId: string, actor: AuthPrincipal) {
    const supplierRequest = await this.get_supplier_request_or_throw(supplierRequestId);
    return this.apply_file_visibility_baseline(supplierRequest, actor);
  }

  async createSupplierRequest(input: CreateSupplierRequestPayload, actor: AuthPrincipal) {
    this.assert_supplier_request_create_access(actor);

    const supplier = await this.supplyRepository.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier '${input.supplierId}' was not found`);
    }

    const normalizedItems = input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      sourceLineRef: item.sourceLineRef.trim(),
      ...(item.sourceLineContext !== undefined
        ? { sourceLineContext: item.sourceLineContext }
        : {})
    }));

    if (!supplier_request_business_source_types.includes(input.businessSourceType)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "SupplierRequest.businessSourceType must be one of: deal, order"
      });
    }

    const createInput: CreateSupplierRequestInput = {
      supplierId: input.supplierId,
      businessSourceType: input.businessSourceType,
      businessSourceId: input.businessSourceId,
      status: "formed",
      expectedSupplyDate: input.expectedSupplyDate,
      requestedBy: actor.userId,
      items: normalizedItems
    };

    const created = await this.supplyRepository.createSupplierRequest(createInput);
    return this.apply_file_visibility_baseline(created, actor);
  }

  async listPurchaseReceipts(query: ReadCollectionQueryInput) {
    return this.supplyRepository.listPurchaseReceipts(query);
  }

  async getPurchaseReceipt(purchaseReceiptId: string): Promise<PurchaseReceiptReadModel> {
    const purchaseReceipt = await this.supplyRepository.getPurchaseReceiptById(purchaseReceiptId);
    if (!purchaseReceipt) {
      throw new NotFoundException(`PurchaseReceipt '${purchaseReceiptId}' was not found`);
    }

    return purchaseReceipt;
  }

  async createPurchaseReceipt(input: CreatePurchaseReceiptPayload, actor: AuthPrincipal) {
    this.assert_purchase_receipt_create_access(actor);

    const warehouse = await this.supplyRepository.getWarehouseById(input.warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse '${input.warehouseId}' was not found`);
    }

    const supplier = await this.supplyRepository.getSupplierById(input.supplierId);
    if (!supplier) {
      throw new NotFoundException(`Supplier '${input.supplierId}' was not found`);
    }

    const supplierRequest = await this.get_supplier_request_or_throw(input.supplierRequestId);

    if (supplierRequest.supplierId !== input.supplierId) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "PurchaseReceipt.supplierId must match SupplierRequest.supplierId"
      });
    }

    const supplierRequestItemsById = new Map(
      supplierRequest.items.map((item) => [item.id, item] as const)
    );
    const supplierRequestItemsByProductAndUnit = new Map<string, SupplierRequestItemReadModel[]>();

    for (const supplierRequestItem of supplierRequest.items) {
      const key = build_supplier_request_item_key(
        supplierRequestItem.productId,
        supplierRequestItem.unit
      );

      const existing = supplierRequestItemsByProductAndUnit.get(key) ?? [];
      existing.push(supplierRequestItem);
      supplierRequestItemsByProductAndUnit.set(key, existing);
    }

    const normalizedItems = input.items.map((item, index) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost.trim(),
      supplierRequestItemId: this.resolve_supplier_request_item_linkage(
        item,
        index,
        supplierRequestItemsById,
        supplierRequestItemsByProductAndUnit
      )
    }));

    const createInput: CreatePurchaseReceiptInput = {
      receiptNumber: generate_purchase_receipt_number(),
      warehouseId: input.warehouseId,
      supplierId: input.supplierId,
      supplierRequestId: input.supplierRequestId,
      receivedAt: input.receivedAt,
      createdBy: actor.userId,
      items: normalizedItems
    };

    return this.supplyRepository.createPurchaseReceipt(createInput);
  }

  async listStockLocks(query: ReadCollectionQueryInput) {
    const listed = await this.supplyRepository.listStockLocks(query);
    const now = new Date();

    return {
      ...listed,
      items: listed.items.map((item) => this.apply_stock_lock_status_baseline(item, now))
    };
  }

  async getStockLock(stockLockId: string) {
    const stockLock = await this.get_stock_lock_or_throw(stockLockId);
    return this.apply_stock_lock_status_baseline(stockLock);
  }

  async createStockLock(input: CreateStockLockPayload, actor: AuthPrincipal) {
    this.assert_stock_lock_create_access(actor);

    const product = await this.supplyRepository.getProductById(input.productId);
    if (!product) {
      throw new NotFoundException(`Product '${input.productId}' was not found`);
    }

    const warehouse = await this.supplyRepository.getWarehouseById(input.warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse '${input.warehouseId}' was not found`);
    }

    const deal = await this.supplyRepository.getDealById(input.dealId);
    if (!deal) {
      throw new NotFoundException(`Deal '${input.dealId}' was not found`);
    }

    const ttlMinutes = this.resolve_stock_lock_ttl_minutes(input.ttlMinutes);
    const createInput: CreateStockLockInput = {
      productId: input.productId,
      warehouseId: input.warehouseId,
      dealId: input.dealId,
      quantity: input.quantity,
      status: "active",
      expiresAt: this.build_expires_at_from_now(ttlMinutes),
      ...(input.idempotencyKey !== undefined
        ? { idempotencyKey: input.idempotencyKey.trim() }
        : {}),
      createdBy: actor.userId
    };

    const created = await this.supplyRepository.createStockLock(createInput);
    return this.apply_stock_lock_status_baseline(created);
  }

  async releaseStockLock(stockLockId: string, actor: AuthPrincipal) {
    this.assert_stock_lock_release_access(actor);

    const current = this.apply_stock_lock_status_baseline(
      await this.get_stock_lock_or_throw(stockLockId)
    );

    if (current.status !== "active") {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: `StockLock transition '${current.status}' -> 'released' is not allowed`
      });
    }

    const updated = await this.supplyRepository.updateStockLockById(stockLockId, {
      status: "released",
      releasedAt: new Date().toISOString()
    });

    return this.apply_stock_lock_status_baseline(updated);
  }

  async listReservations(query: ReadCollectionQueryInput) {
    const listed = await this.supplyRepository.listReservations(query);
    const now = new Date();

    return {
      ...listed,
      items: listed.items.map((item) => this.apply_reservation_status_baseline(item, now))
    };
  }

  async getReservation(reservationId: string) {
    const reservation = await this.get_reservation_or_throw(reservationId);
    return this.apply_reservation_status_baseline(reservation);
  }

  async createReservationsForOrder(
    input: CreateReservationsForOrderPayload,
    actor: AuthPrincipal
  ) {
    const order = await this.supplyRepository.getOrderById(input.orderId);
    if (!order || order.isDeleted) {
      throw new BadRequestException({
        code: "RESERVATION_NOT_ALLOWED",
        message: "Durable reservation is allowed only for an existing active Order"
      });
    }

    const warehouse = await this.supplyRepository.getWarehouseById(input.warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse '${input.warehouseId}' was not found`);
    }

    const createInput: CreateReservationInput[] = [];
    for (const [index, item] of input.items.entries()) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: `Reservation item #${index + 1} quantity must be greater than zero`
        });
      }

      const product = await this.supplyRepository.getProductById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product '${item.productId}' was not found`);
      }

      createInput.push({
        orderId: input.orderId,
        warehouseId: input.warehouseId,
        productId: item.productId,
        quantity: item.quantity,
        status: "active",
        expiresAt: this.resolve_reservation_expires_at(item.expiresAt, index),
        createdBy: actor.userId
      });
    }

    const created = await this.supplyRepository.createReservations(createInput);
    return created.map((item) => this.apply_reservation_status_baseline(item));
  }

  async releaseReservationInternal(reservationId: string) {
    const current = this.apply_reservation_status_baseline(
      await this.get_reservation_or_throw(reservationId)
    );

    if (current.status !== "active") {
      throw new ConflictException({
        code: "TRANSITION_NOT_ALLOWED",
        message: `Reservation transition '${current.status}' -> 'released' is not allowed`
      });
    }

    const updated = await this.supplyRepository.updateReservationById(reservationId, {
      status: "released",
      releasedAt: new Date().toISOString()
    });

    return this.apply_reservation_status_baseline(updated);
  }

  async confirmSupplierRequestBySupplier(
    supplierRequestId: string,
    input: ConfirmSupplierRequestBySupplierPayload,
    actor: AuthPrincipal
  ) {
    this.assert_supplier_request_confirm_access(actor);
    const current = await this.get_supplier_request_or_throw(supplierRequestId);
    this.assert_supplier_request_transition(current.status, "confirmed_by_supplier");

    const updated = await this.supplyRepository.updateSupplierRequestById(supplierRequestId, {
      status: "confirmed_by_supplier",
      expectedSupplyDate: input.expectedSupplyDate,
      confirmedBy: actor.userId
    });

    return this.apply_file_visibility_baseline(updated, actor);
  }

  async markSupplierRequestPaid(supplierRequestId: string, actor: AuthPrincipal) {
    this.assert_supplier_request_paid_access(actor);
    const current = await this.get_supplier_request_or_throw(supplierRequestId);
    this.assert_supplier_request_transition(current.status, "paid");

    const updated = await this.supplyRepository.updateSupplierRequestById(supplierRequestId, {
      status: "paid",
      paidBy: actor.userId,
      paidAt: new Date().toISOString()
    });

    return this.apply_file_visibility_baseline(updated, actor);
  }

  async markSupplierRequestStocked(supplierRequestId: string, actor: AuthPrincipal) {
    this.assert_supplier_request_stocked_access(actor);
    const current = await this.get_supplier_request_or_throw(supplierRequestId);
    this.assert_supplier_request_transition(current.status, "stocked");

    const updated = await this.supplyRepository.updateSupplierRequestById(supplierRequestId, {
      status: "stocked",
      stockedBy: actor.userId,
      stockedAt: new Date().toISOString()
    });

    return this.apply_file_visibility_baseline(updated, actor);
  }

  private to_create_supplier_input(input: CreateSupplierPayload): CreateSupplierInput {
    return {
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: normalize_optional_text(input.phone) } : {}),
      ...(input.email !== undefined ? { email: normalize_optional_text(input.email) } : {}),
      ...(input.notes !== undefined ? { notes: normalize_optional_text(input.notes) } : {})
    };
  }

  private resolve_supplier_request_item_linkage(
    item: CreatePurchaseReceiptItemPayload,
    lineIndex: number,
    supplierRequestItemsById: Map<string, SupplierRequestItemReadModel>,
    supplierRequestItemsByProductAndUnit: Map<string, SupplierRequestItemReadModel[]>
  ): string {
    if (item.supplierRequestItemId) {
      const linkedItem = supplierRequestItemsById.get(item.supplierRequestItemId);
      if (!linkedItem) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: `PurchaseReceipt item #${lineIndex + 1} has unknown supplierRequestItemId`
        });
      }

      if (linkedItem.productId !== item.productId || linkedItem.unit !== item.unit) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message:
            "PurchaseReceipt item linkage mismatch: productId/unit must match referenced SupplierRequestItem"
        });
      }

      return linkedItem.id;
    }

    const key = build_supplier_request_item_key(item.productId, item.unit);
    const candidates = supplierRequestItemsByProductAndUnit.get(key) ?? [];

    if (candidates.length === 1) {
      const [candidate] = candidates;
      if (!candidate) {
        throw new BadRequestException({
          code: "VALIDATION_ERROR",
          message: `PurchaseReceipt item #${lineIndex + 1} failed to resolve SupplierRequestItem`
        });
      }

      return candidate.id;
    }

    if (candidates.length === 0) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message:
          "PurchaseReceipt item linkage mismatch: each receipt item must map to SupplierRequest items"
      });
    }

    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message:
        "PurchaseReceipt item linkage is ambiguous for productId/unit; provide supplierRequestItemId"
    });
  }

  private assert_supplier_write_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      supplier_write_role_codes.has(roleCode as "seller" | "admin" | "ceo")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Supplier write access is denied for current role"
      });
    }
  }

  private assert_supplier_request_create_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      supplier_request_create_role_codes.has(roleCode as "seller")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "SupplierRequest create action is allowed only for seller role"
      });
    }
  }

  private assert_supplier_request_confirm_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      supplier_request_confirm_role_codes.has(roleCode as "seller")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "SupplierRequest confirm-by-supplier action is allowed only for seller role"
      });
    }
  }

  private assert_supplier_request_paid_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      supplier_request_paid_role_codes.has(roleCode as "finance" | "ceo")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "SupplierRequest mark-paid action is allowed only for finance or ceo role"
      });
    }
  }

  private assert_supplier_request_stocked_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      supplier_request_stocked_role_codes.has(roleCode as "warehouse")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "SupplierRequest mark-stocked action is allowed only for warehouse role"
      });
    }
  }

  private assert_purchase_receipt_create_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      purchase_receipt_create_role_codes.has(roleCode as "warehouse")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "PurchaseReceipt create action is allowed only for warehouse role"
      });
    }
  }

  private assert_stock_lock_create_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      stock_lock_create_role_codes.has(roleCode as "seller")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "StockLock create action is allowed only for seller role"
      });
    }
  }

  private assert_stock_lock_release_access(actor: AuthPrincipal): void {
    const isAllowed = actor.roleCodes.some((roleCode) =>
      stock_lock_release_role_codes.has(roleCode as "seller")
    );

    if (!isAllowed) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "StockLock release action is allowed only for seller role"
      });
    }
  }

  private assert_supplier_request_transition(
    from: SupplierRequestStatus,
    to: SupplierRequestStatus
  ): void {
    try {
      assert_supplier_request_status_transition(from, to);
    } catch (error) {
      if (error instanceof StatusTransitionError) {
        throw new ConflictException({
          code: "TRANSITION_NOT_ALLOWED",
          message: error.message
        });
      }

      throw error;
    }
  }

  private async get_supplier_request_or_throw(
    supplierRequestId: string
  ): Promise<SupplierRequestReadModel> {
    const supplierRequest = await this.supplyRepository.getSupplierRequestById(supplierRequestId);
    if (!supplierRequest) {
      throw new NotFoundException(`SupplierRequest '${supplierRequestId}' was not found`);
    }

    return supplierRequest;
  }

  private async get_stock_lock_or_throw(stockLockId: string): Promise<StockLockReadModel> {
    const stockLock = await this.supplyRepository.getStockLockById(stockLockId);
    if (!stockLock) {
      throw new NotFoundException(`StockLock '${stockLockId}' was not found`);
    }

    return stockLock;
  }

  private async get_reservation_or_throw(reservationId: string): Promise<ReservationReadModel> {
    const reservation = await this.supplyRepository.getReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reservation '${reservationId}' was not found`);
    }

    return reservation;
  }

  private resolve_stock_lock_ttl_minutes(ttlMinutes?: number): number {
    if (ttlMinutes === undefined) {
      return stock_lock_ttl_default_minutes;
    }

    if (!Number.isInteger(ttlMinutes)) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "StockLock ttlMinutes must be an integer"
      });
    }

    if (ttlMinutes < stock_lock_ttl_min_minutes || ttlMinutes > stock_lock_ttl_max_minutes) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `StockLock ttlMinutes must stay within ${stock_lock_ttl_min_minutes}-${stock_lock_ttl_max_minutes} minutes`
      });
    }

    return ttlMinutes;
  }

  private build_expires_at_from_now(ttlMinutes: number): string {
    const now = Date.now();
    const expiresAt = new Date(now + ttlMinutes * 60 * 1000);
    return expiresAt.toISOString();
  }

  private resolve_reservation_expires_at(rawExpiresAt: string, lineIndex: number): string {
    const expiresAt = new Date(rawExpiresAt);
    if (Number.isNaN(expiresAt.valueOf())) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Reservation item #${lineIndex + 1} has invalid expiresAt`
      });
    }

    if (expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: `Reservation item #${lineIndex + 1} expiresAt must be in the future`
      });
    }

    return expiresAt.toISOString();
  }

  private apply_stock_lock_status_baseline(
    stockLock: StockLockReadModel | StockLockListReadModel,
    now = new Date()
  ) {
    if (stockLock.status !== "active") {
      return stockLock;
    }

    const expiresAt = new Date(stockLock.expiresAt);
    if (Number.isNaN(expiresAt.valueOf())) {
      return stockLock;
    }

    if (expiresAt.getTime() > now.getTime()) {
      return stockLock;
    }

    return {
      ...stockLock,
      status: "expired"
    };
  }

  private apply_reservation_status_baseline(
    reservation: ReservationReadModel,
    now = new Date()
  ): ReservationReadModel {
    if (reservation.status !== "active") {
      return reservation;
    }

    const expiresAt = new Date(reservation.expiresAt);
    if (Number.isNaN(expiresAt.valueOf())) {
      return reservation;
    }

    if (expiresAt.getTime() > now.getTime()) {
      return reservation;
    }

    return {
      ...reservation,
      status: "expired"
    };
  }

  private apply_file_visibility_baseline(
    supplierRequest: SupplierRequestReadModel,
    actor: AuthPrincipal
  ): SupplierRequestReadModel {
    const canViewFile = actor.roleCodes.some((roleCode) =>
      supplier_request_file_role_codes.has(roleCode as "warehouse" | "finance" | "ceo")
    );

    if (canViewFile) {
      return supplierRequest;
    }

    return {
      ...supplierRequest,
      supplierDocumentUrl: null
    };
  }
}

function build_supplier_request_item_key(productId: string, unit: ProductUnit): string {
  return `${productId}:${unit}`;
}

function generate_purchase_receipt_number(): string {
  return `PR-${randomUUID()}`;
}

function normalize_optional_text(value: string | null | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
