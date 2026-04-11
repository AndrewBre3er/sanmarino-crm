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
  SupplierRequestStatus
} from "../transactional/shared/status.contract";
import { StatusTransitionError } from "../transactional/shared/transition.guard";
import { assert_supplier_request_status_transition } from "./supplier-request.transition.guard";
import {
  PrismaSupplyRepository,
  type CreatePurchaseReceiptInput,
  type CreateSupplierInput,
  type CreateSupplierRequestInput,
  type PurchaseReceiptReadModel,
  type SupplierRequestItemReadModel,
  type SupplierRequestReadModel
} from "./supply.repository";

const supplier_write_role_codes = new Set(["seller", "admin", "ceo"] as const);
const supplier_request_create_role_codes = new Set(["seller"] as const);
const supplier_request_confirm_role_codes = new Set(["seller"] as const);
const supplier_request_paid_role_codes = new Set(["finance", "ceo"] as const);
const supplier_request_stocked_role_codes = new Set(["warehouse"] as const);
const purchase_receipt_create_role_codes = new Set(["warehouse"] as const);
const supplier_request_business_source_types = ["deal", "order"] as const;
const supplier_request_file_role_codes = new Set(["warehouse", "finance", "ceo"] as const);

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
