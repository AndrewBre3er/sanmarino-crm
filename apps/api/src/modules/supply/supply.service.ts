import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthPrincipal } from "../auth/auth.contract";
import type { ReadCollectionQueryInput } from "../read-side/shared/read-model.contract";
import type { ProductUnit } from "../transactional/shared/status.contract";
import {
  PrismaSupplyRepository,
  type CreateSupplierInput,
  type CreateSupplierRequestInput
} from "./supply.repository";

const supplier_write_role_codes = new Set(["seller", "admin", "ceo"] as const);
const supplier_request_create_role_codes = new Set(["seller"] as const);
const supplier_request_business_source_types = ["deal", "order"] as const;

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

  async getSupplierRequest(supplierRequestId: string) {
    const supplierRequest = await this.supplyRepository.getSupplierRequestById(supplierRequestId);
    if (!supplierRequest) {
      throw new NotFoundException(`SupplierRequest '${supplierRequestId}' was not found`);
    }

    return supplierRequest;
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

    return this.supplyRepository.createSupplierRequest(createInput);
  }

  private to_create_supplier_input(input: CreateSupplierPayload): CreateSupplierInput {
    return {
      name: input.name.trim(),
      ...(input.phone !== undefined ? { phone: normalize_optional_text(input.phone) } : {}),
      ...(input.email !== undefined ? { email: normalize_optional_text(input.email) } : {}),
      ...(input.notes !== undefined ? { notes: normalize_optional_text(input.notes) } : {})
    };
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
