import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  IdempotencyStatus as PrismaIdempotencyStatus,
  LogisticsDeliverySlot,
  LogisticsDriver,
  LogisticsPickupWindow,
  LogisticsRouteDay,
  LogisticsVehicle,
  RouteDayStatus as PrismaRouteDayStatus,
  SlotStatus as PrismaSlotStatus
} from "@prisma/client";
import type { AuthPrincipal } from "../auth/auth.contract";
import { build_page_pagination_meta } from "../read-side/shared/read-query.dto";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../read-side/shared/read-model.contract";
import {
  from_prisma_enum,
  to_iso_datetime,
  to_prisma_enum
} from "../read-side/shared/prisma-read.mapper";
import {
  logistics_route_day_statuses,
  logistics_slot_statuses,
  type LogisticsRouteDayStatus,
  type LogisticsSlotStatus
} from "../transactional/shared/status.contract";
import { PrismaService } from "../../prisma/prisma.service";

const logistics_resource_command_roles = new Set([
  "logistics",
  "admin",
  "ceo"
] as const);

const create_delivery_slot_idempotency_scope = "logistics.delivery_slot.create.v1";
const patch_delivery_slot_idempotency_scope = "logistics.delivery_slot.patch.v1";
const create_pickup_window_idempotency_scope = "logistics.pickup_window.create.v1";
const patch_pickup_window_idempotency_scope = "logistics.pickup_window.patch.v1";
const create_driver_idempotency_scope = "logistics.driver.create.v1";
const patch_driver_idempotency_scope = "logistics.driver.patch.v1";
const create_vehicle_idempotency_scope = "logistics.vehicle.create.v1";
const patch_vehicle_idempotency_scope = "logistics.vehicle.patch.v1";
const create_route_day_idempotency_scope = "logistics.route_day.create.v1";
const patch_route_day_idempotency_scope = "logistics.route_day.patch.v1";

interface AcquiredIdempotencyRecord {
  recordId: string;
  replayed: boolean;
  responseBody: Prisma.JsonValue | null;
}

interface IdempotentResourceCommandOptions<TReadModel> {
  scope: string;
  context: LogisticsResourceCommandContext;
  requestPayload: Record<string, unknown>;
  responseIdKey: string;
  fallbackEntityId?: string;
  resolveById: (id: string) => Promise<TReadModel>;
  mutate: (client: Prisma.TransactionClient) => Promise<string>;
}

type LogisticsDbClient = PrismaService | Prisma.TransactionClient;

export interface LogisticsResourceCommandContext {
  idempotencyKey: string;
  requestId?: string;
  correlationId?: string;
}

export interface DeliverySlotReadModel {
  id: string;
  slotDate: string;
  windowStart: string;
  windowEnd: string;
  capacity: number;
  reservedCount: number;
  status: LogisticsSlotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PickupWindowReadModel {
  id: string;
  windowDate: string;
  windowStart: string;
  windowEnd: string;
  capacity: number;
  reservedCount: number;
  status: LogisticsSlotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DriverReadModel {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleReadModel {
  id: string;
  plateNumber: string | null;
  name: string;
  capacityNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RouteDayReadModel {
  id: string;
  routeDate: string;
  driverId: string | null;
  vehicleId: string | null;
  status: LogisticsRouteDayStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliverySlotInput {
  slotDate: string;
  windowStart: string;
  windowEnd: string;
  capacity?: number;
  status?: LogisticsSlotStatus;
}

export interface PatchDeliverySlotInput {
  slotDate?: string;
  windowStart?: string;
  windowEnd?: string;
  capacity?: number;
  status?: LogisticsSlotStatus;
}

export interface CreatePickupWindowInput {
  windowDate: string;
  windowStart: string;
  windowEnd: string;
  capacity?: number;
  status?: LogisticsSlotStatus;
}

export interface PatchPickupWindowInput {
  windowDate?: string;
  windowStart?: string;
  windowEnd?: string;
  capacity?: number;
  status?: LogisticsSlotStatus;
}

export interface CreateDriverInput {
  userId?: string | null;
  name: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface PatchDriverInput {
  userId?: string | null;
  name?: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface CreateVehicleInput {
  plateNumber?: string | null;
  name: string;
  capacityNotes?: string | null;
  isActive?: boolean;
}

export interface PatchVehicleInput {
  plateNumber?: string | null;
  name?: string;
  capacityNotes?: string | null;
  isActive?: boolean;
}

export interface CreateRouteDayInput {
  routeDate: string;
  driverId?: string | null;
  vehicleId?: string | null;
  status?: LogisticsRouteDayStatus;
  notes?: string | null;
}

export interface PatchRouteDayInput {
  routeDate?: string;
  driverId?: string | null;
  vehicleId?: string | null;
  status?: LogisticsRouteDayStatus;
  notes?: string | null;
}

@Injectable()
export class LogisticsResourcesService {
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async listDeliverySlots(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<DeliverySlotReadModel>> {
    const and_clauses: Prisma.LogisticsDeliverySlotWhereInput[] = [];

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaSlotStatus>(value)
      );
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
    }

    const where: Prisma.LogisticsDeliverySlotWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};
    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsDeliverySlotOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsDeliverySlot.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsDeliverySlot.count({ where })
    ]);

    return {
      items: items.map(map_delivery_slot_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getDeliverySlot(slotId: string): Promise<DeliverySlotReadModel> {
    const slot = await this.prismaService.logisticsDeliverySlot.findFirst({
      where: {
        id: slotId
      }
    });
    if (!slot) {
      throw new NotFoundException(`Delivery slot '${slotId}' was not found`);
    }

    return map_delivery_slot_read_model(slot);
  }

  async createDeliverySlot(
    input: CreateDeliverySlotInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<DeliverySlotReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_create_delivery_slot_input(input);
    return this.execute_idempotent_resource_command({
      scope: create_delivery_slot_idempotency_scope,
      context,
      responseIdKey: "slotId",
      requestPayload: {
        slotDate: normalized.slotDate.toISOString(),
        windowStart: normalized.windowStart.toISOString(),
        windowEnd: normalized.windowEnd.toISOString(),
        capacity: normalized.capacity,
        status: normalized.status ?? null
      },
      resolveById: (slotId) => this.getDeliverySlot(slotId),
      mutate: async (client) => {
        const created = await client.logisticsDeliverySlot.create({
          data: {
            slotDate: normalized.slotDate,
            windowStart: normalized.windowStart,
            windowEnd: normalized.windowEnd,
            capacity: normalized.capacity,
            ...(normalized.status
              ? { status: to_prisma_enum<PrismaSlotStatus>(normalized.status) }
              : {})
          },
          select: {
            id: true
          }
        });

        return created.id;
      }
    });
  }

  async patchDeliverySlot(
    slotId: string,
    input: PatchDeliverySlotInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<DeliverySlotReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_patch_delivery_slot_input(input);
    return this.execute_idempotent_resource_command({
      scope: patch_delivery_slot_idempotency_scope,
      context,
      responseIdKey: "slotId",
      fallbackEntityId: slotId,
      requestPayload: {
        slotId,
        ...(normalized.slotDate !== undefined
          ? { slotDate: normalized.slotDate.toISOString() }
          : {}),
        ...(normalized.windowStart !== undefined
          ? { windowStart: normalized.windowStart.toISOString() }
          : {}),
        ...(normalized.windowEnd !== undefined
          ? { windowEnd: normalized.windowEnd.toISOString() }
          : {}),
        ...(normalized.capacity !== undefined ? { capacity: normalized.capacity } : {}),
        ...(normalized.status !== undefined ? { status: normalized.status } : {})
      },
      resolveById: (resolvedSlotId) => this.getDeliverySlot(resolvedSlotId),
      mutate: async (client) => {
        const existing = await client.logisticsDeliverySlot.findUnique({
          where: { id: slotId },
          select: { id: true }
        });
        if (!existing) {
          throw new NotFoundException(`Delivery slot '${slotId}' was not found`);
        }

        await client.logisticsDeliverySlot.update({
          where: { id: slotId },
          data: {
            ...(normalized.slotDate !== undefined ? { slotDate: normalized.slotDate } : {}),
            ...(normalized.windowStart !== undefined
              ? { windowStart: normalized.windowStart }
              : {}),
            ...(normalized.windowEnd !== undefined ? { windowEnd: normalized.windowEnd } : {}),
            ...(normalized.capacity !== undefined ? { capacity: normalized.capacity } : {}),
            ...(normalized.status !== undefined
              ? { status: to_prisma_enum<PrismaSlotStatus>(normalized.status) }
              : {})
          }
        });

        return slotId;
      }
    });
  }

  async listPickupWindows(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<PickupWindowReadModel>> {
    const and_clauses: Prisma.LogisticsPickupWindowWhereInput[] = [];

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaSlotStatus>(value)
      );
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
    }

    const where: Prisma.LogisticsPickupWindowWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};
    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsPickupWindowOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsPickupWindow.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsPickupWindow.count({ where })
    ]);

    return {
      items: items.map(map_pickup_window_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getPickupWindow(pickupWindowId: string): Promise<PickupWindowReadModel> {
    const pickupWindow = await this.prismaService.logisticsPickupWindow.findFirst({
      where: {
        id: pickupWindowId
      }
    });
    if (!pickupWindow) {
      throw new NotFoundException(`Pickup window '${pickupWindowId}' was not found`);
    }

    return map_pickup_window_read_model(pickupWindow);
  }

  async createPickupWindow(
    input: CreatePickupWindowInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<PickupWindowReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_create_pickup_window_input(input);
    return this.execute_idempotent_resource_command({
      scope: create_pickup_window_idempotency_scope,
      context,
      responseIdKey: "pickupWindowId",
      requestPayload: {
        windowDate: normalized.windowDate.toISOString(),
        windowStart: normalized.windowStart.toISOString(),
        windowEnd: normalized.windowEnd.toISOString(),
        capacity: normalized.capacity,
        status: normalized.status ?? null
      },
      resolveById: (pickupWindowId) => this.getPickupWindow(pickupWindowId),
      mutate: async (client) => {
        const created = await client.logisticsPickupWindow.create({
          data: {
            windowDate: normalized.windowDate,
            windowStart: normalized.windowStart,
            windowEnd: normalized.windowEnd,
            capacity: normalized.capacity,
            ...(normalized.status
              ? { status: to_prisma_enum<PrismaSlotStatus>(normalized.status) }
              : {})
          },
          select: {
            id: true
          }
        });

        return created.id;
      }
    });
  }

  async patchPickupWindow(
    pickupWindowId: string,
    input: PatchPickupWindowInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<PickupWindowReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_patch_pickup_window_input(input);
    return this.execute_idempotent_resource_command({
      scope: patch_pickup_window_idempotency_scope,
      context,
      responseIdKey: "pickupWindowId",
      fallbackEntityId: pickupWindowId,
      requestPayload: {
        pickupWindowId,
        ...(normalized.windowDate !== undefined
          ? { windowDate: normalized.windowDate.toISOString() }
          : {}),
        ...(normalized.windowStart !== undefined
          ? { windowStart: normalized.windowStart.toISOString() }
          : {}),
        ...(normalized.windowEnd !== undefined
          ? { windowEnd: normalized.windowEnd.toISOString() }
          : {}),
        ...(normalized.capacity !== undefined ? { capacity: normalized.capacity } : {}),
        ...(normalized.status !== undefined ? { status: normalized.status } : {})
      },
      resolveById: (resolvedPickupWindowId) => this.getPickupWindow(resolvedPickupWindowId),
      mutate: async (client) => {
        const existing = await client.logisticsPickupWindow.findUnique({
          where: { id: pickupWindowId },
          select: { id: true }
        });
        if (!existing) {
          throw new NotFoundException(`Pickup window '${pickupWindowId}' was not found`);
        }

        await client.logisticsPickupWindow.update({
          where: { id: pickupWindowId },
          data: {
            ...(normalized.windowDate !== undefined ? { windowDate: normalized.windowDate } : {}),
            ...(normalized.windowStart !== undefined
              ? { windowStart: normalized.windowStart }
              : {}),
            ...(normalized.windowEnd !== undefined
              ? { windowEnd: normalized.windowEnd }
              : {}),
            ...(normalized.capacity !== undefined ? { capacity: normalized.capacity } : {}),
            ...(normalized.status !== undefined
              ? { status: to_prisma_enum<PrismaSlotStatus>(normalized.status) }
              : {})
          }
        });

        return pickupWindowId;
      }
    });
  }

  async listDrivers(query: ReadCollectionQueryInput): Promise<ReadCollectionResult<DriverReadModel>> {
    const and_clauses: Prisma.LogisticsDriverWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    const isActive = extract_boolean_eq_filter(query, "isActive");
    if (isActive !== undefined) {
      and_clauses.push({ isActive });
    }

    const where: Prisma.LogisticsDriverWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};
    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsDriverOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsDriver.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsDriver.count({ where })
    ]);

    return {
      items: items.map(map_driver_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getDriver(driverId: string): Promise<DriverReadModel> {
    const driver = await this.prismaService.logisticsDriver.findFirst({
      where: {
        id: driverId
      }
    });
    if (!driver) {
      throw new NotFoundException(`Driver '${driverId}' was not found`);
    }

    return map_driver_read_model(driver);
  }

  async createDriver(
    input: CreateDriverInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<DriverReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_create_driver_input(input);
    return this.execute_idempotent_resource_command({
      scope: create_driver_idempotency_scope,
      context,
      responseIdKey: "driverId",
      requestPayload: {
        userId: normalized.userId ?? null,
        name: normalized.name,
        phone: normalized.phone ?? null,
        isActive: normalized.isActive
      },
      resolveById: (driverId) => this.getDriver(driverId),
      mutate: async (client) => {
        if (normalized.userId) {
          await this.assert_user_exists(client, normalized.userId);
        }

        const created = await client.logisticsDriver.create({
          data: {
            ...(normalized.userId !== undefined ? { userId: normalized.userId } : {}),
            name: normalized.name,
            ...(normalized.phone !== undefined ? { phone: normalized.phone } : {}),
            isActive: normalized.isActive
          },
          select: {
            id: true
          }
        });

        return created.id;
      }
    });
  }

  async patchDriver(
    driverId: string,
    input: PatchDriverInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<DriverReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_patch_driver_input(input);
    return this.execute_idempotent_resource_command({
      scope: patch_driver_idempotency_scope,
      context,
      responseIdKey: "driverId",
      fallbackEntityId: driverId,
      requestPayload: {
        driverId,
        ...(normalized.userId !== undefined ? { userId: normalized.userId } : {}),
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.phone !== undefined ? { phone: normalized.phone } : {}),
        ...(normalized.isActive !== undefined ? { isActive: normalized.isActive } : {})
      },
      resolveById: (resolvedDriverId) => this.getDriver(resolvedDriverId),
      mutate: async (client) => {
        const existing = await client.logisticsDriver.findUnique({
          where: { id: driverId },
          select: { id: true }
        });
        if (!existing) {
          throw new NotFoundException(`Driver '${driverId}' was not found`);
        }

        if (normalized.userId) {
          await this.assert_user_exists(client, normalized.userId);
        }

        await client.logisticsDriver.update({
          where: { id: driverId },
          data: {
            ...(normalized.userId !== undefined ? { userId: normalized.userId } : {}),
            ...(normalized.name !== undefined ? { name: normalized.name } : {}),
            ...(normalized.phone !== undefined ? { phone: normalized.phone } : {}),
            ...(normalized.isActive !== undefined ? { isActive: normalized.isActive } : {})
          }
        });

        return driverId;
      }
    });
  }

  async listVehicles(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<VehicleReadModel>> {
    const and_clauses: Prisma.LogisticsVehicleWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { plateNumber: { contains: query.search, mode: "insensitive" } },
          { capacityNotes: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    const isActive = extract_boolean_eq_filter(query, "isActive");
    if (isActive !== undefined) {
      and_clauses.push({ isActive });
    }

    const where: Prisma.LogisticsVehicleWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};
    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsVehicleOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsVehicle.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsVehicle.count({ where })
    ]);

    return {
      items: items.map(map_vehicle_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getVehicle(vehicleId: string): Promise<VehicleReadModel> {
    const vehicle = await this.prismaService.logisticsVehicle.findFirst({
      where: {
        id: vehicleId
      }
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle '${vehicleId}' was not found`);
    }

    return map_vehicle_read_model(vehicle);
  }

  async createVehicle(
    input: CreateVehicleInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<VehicleReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_create_vehicle_input(input);
    return this.execute_idempotent_resource_command({
      scope: create_vehicle_idempotency_scope,
      context,
      responseIdKey: "vehicleId",
      requestPayload: {
        plateNumber: normalized.plateNumber ?? null,
        name: normalized.name,
        capacityNotes: normalized.capacityNotes ?? null,
        isActive: normalized.isActive
      },
      resolveById: (vehicleId) => this.getVehicle(vehicleId),
      mutate: async (client) => {
        const created = await client.logisticsVehicle.create({
          data: {
            ...(normalized.plateNumber !== undefined
              ? { plateNumber: normalized.plateNumber }
              : {}),
            name: normalized.name,
            ...(normalized.capacityNotes !== undefined
              ? { capacityNotes: normalized.capacityNotes }
              : {}),
            isActive: normalized.isActive
          },
          select: {
            id: true
          }
        });

        return created.id;
      }
    });
  }

  async patchVehicle(
    vehicleId: string,
    input: PatchVehicleInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<VehicleReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_patch_vehicle_input(input);
    return this.execute_idempotent_resource_command({
      scope: patch_vehicle_idempotency_scope,
      context,
      responseIdKey: "vehicleId",
      fallbackEntityId: vehicleId,
      requestPayload: {
        vehicleId,
        ...(normalized.plateNumber !== undefined ? { plateNumber: normalized.plateNumber } : {}),
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.capacityNotes !== undefined
          ? { capacityNotes: normalized.capacityNotes }
          : {}),
        ...(normalized.isActive !== undefined ? { isActive: normalized.isActive } : {})
      },
      resolveById: (resolvedVehicleId) => this.getVehicle(resolvedVehicleId),
      mutate: async (client) => {
        const existing = await client.logisticsVehicle.findUnique({
          where: { id: vehicleId },
          select: { id: true }
        });
        if (!existing) {
          throw new NotFoundException(`Vehicle '${vehicleId}' was not found`);
        }

        await client.logisticsVehicle.update({
          where: { id: vehicleId },
          data: {
            ...(normalized.plateNumber !== undefined
              ? { plateNumber: normalized.plateNumber }
              : {}),
            ...(normalized.name !== undefined ? { name: normalized.name } : {}),
            ...(normalized.capacityNotes !== undefined
              ? { capacityNotes: normalized.capacityNotes }
              : {}),
            ...(normalized.isActive !== undefined ? { isActive: normalized.isActive } : {})
          }
        });

        return vehicleId;
      }
    });
  }

  async listRouteDays(
    query: ReadCollectionQueryInput
  ): Promise<ReadCollectionResult<RouteDayReadModel>> {
    const and_clauses: Prisma.LogisticsRouteDayWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        notes: { contains: query.search, mode: "insensitive" }
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaRouteDayStatus>(value)
      );
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
    }

    const driverId = extract_eq_filter(query, "driverId");
    if (driverId) {
      and_clauses.push({ driverId });
    }

    const vehicleId = extract_eq_filter(query, "vehicleId");
    if (vehicleId) {
      and_clauses.push({ vehicleId });
    }

    const where: Prisma.LogisticsRouteDayWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};
    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsRouteDayOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsRouteDay.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsRouteDay.count({ where })
    ]);

    return {
      items: items.map(map_route_day_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getRouteDay(routeDayId: string): Promise<RouteDayReadModel> {
    const routeDay = await this.prismaService.logisticsRouteDay.findFirst({
      where: {
        id: routeDayId
      }
    });
    if (!routeDay) {
      throw new NotFoundException(`Route day '${routeDayId}' was not found`);
    }

    return map_route_day_read_model(routeDay);
  }

  async createRouteDay(
    input: CreateRouteDayInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<RouteDayReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_create_route_day_input(input);
    return this.execute_idempotent_resource_command({
      scope: create_route_day_idempotency_scope,
      context,
      responseIdKey: "routeDayId",
      requestPayload: {
        routeDate: normalized.routeDate.toISOString(),
        driverId: normalized.driverId ?? null,
        vehicleId: normalized.vehicleId ?? null,
        status: normalized.status ?? null,
        notes: normalized.notes ?? null
      },
      resolveById: (routeDayId) => this.getRouteDay(routeDayId),
      mutate: async (client) => {
        if (normalized.driverId) {
          await this.assert_driver_exists(client, normalized.driverId);
        }
        if (normalized.vehicleId) {
          await this.assert_vehicle_exists(client, normalized.vehicleId);
        }

        const created = await client.logisticsRouteDay.create({
          data: {
            routeDate: normalized.routeDate,
            ...(normalized.driverId !== undefined ? { driverId: normalized.driverId } : {}),
            ...(normalized.vehicleId !== undefined ? { vehicleId: normalized.vehicleId } : {}),
            ...(normalized.status
              ? { status: to_prisma_enum<PrismaRouteDayStatus>(normalized.status) }
              : {}),
            ...(normalized.notes !== undefined ? { notes: normalized.notes } : {})
          },
          select: {
            id: true
          }
        });

        return created.id;
      }
    });
  }

  async patchRouteDay(
    routeDayId: string,
    input: PatchRouteDayInput,
    actor: Pick<AuthPrincipal, "roleCodes">,
    context: LogisticsResourceCommandContext
  ): Promise<RouteDayReadModel> {
    this.assert_command_access(actor);
    const normalized = normalize_patch_route_day_input(input);
    return this.execute_idempotent_resource_command({
      scope: patch_route_day_idempotency_scope,
      context,
      responseIdKey: "routeDayId",
      fallbackEntityId: routeDayId,
      requestPayload: {
        routeDayId,
        ...(normalized.routeDate !== undefined
          ? { routeDate: normalized.routeDate.toISOString() }
          : {}),
        ...(normalized.driverId !== undefined ? { driverId: normalized.driverId } : {}),
        ...(normalized.vehicleId !== undefined ? { vehicleId: normalized.vehicleId } : {}),
        ...(normalized.status !== undefined ? { status: normalized.status } : {}),
        ...(normalized.notes !== undefined ? { notes: normalized.notes } : {})
      },
      resolveById: (resolvedRouteDayId) => this.getRouteDay(resolvedRouteDayId),
      mutate: async (client) => {
        const existing = await client.logisticsRouteDay.findUnique({
          where: { id: routeDayId },
          select: { id: true }
        });
        if (!existing) {
          throw new NotFoundException(`Route day '${routeDayId}' was not found`);
        }

        if (normalized.driverId) {
          await this.assert_driver_exists(client, normalized.driverId);
        }
        if (normalized.vehicleId) {
          await this.assert_vehicle_exists(client, normalized.vehicleId);
        }

        await client.logisticsRouteDay.update({
          where: { id: routeDayId },
          data: {
            ...(normalized.routeDate !== undefined ? { routeDate: normalized.routeDate } : {}),
            ...(normalized.driverId !== undefined ? { driverId: normalized.driverId } : {}),
            ...(normalized.vehicleId !== undefined ? { vehicleId: normalized.vehicleId } : {}),
            ...(normalized.status !== undefined
              ? { status: to_prisma_enum<PrismaRouteDayStatus>(normalized.status) }
              : {}),
            ...(normalized.notes !== undefined ? { notes: normalized.notes } : {})
          }
        });

        return routeDayId;
      }
    });
  }

  private async execute_idempotent_resource_command<TReadModel>(
    options: IdempotentResourceCommandOptions<TReadModel>
  ): Promise<TReadModel> {
    const requestHash = build_command_request_hash(options.requestPayload);
    const idempotency = await this.acquire_idempotency(
      options.scope,
      options.context.idempotencyKey,
      requestHash
    );

    if (idempotency.replayed) {
      const entityId =
        resolve_id_from_response_body(idempotency.responseBody, options.responseIdKey) ??
        options.fallbackEntityId;
      if (!entityId) {
        throw new ConflictException({
          code: "SOURCE_OF_TRUTH_VIOLATION",
          message: "Idempotency record does not contain resource reference"
        });
      }

      return options.resolveById(entityId);
    }

    try {
      const entityId = await this.prismaService.$transaction(async (client) => {
        const resolvedEntityId = await options.mutate(client);
        await client.systemIdempotencyRecord.update({
          where: { id: idempotency.recordId },
          data: {
            status: to_prisma_enum<PrismaIdempotencyStatus>("completed"),
            responseStatusCode: 200,
            responseBody: {
              [options.responseIdKey]: resolvedEntityId
            },
            lockedUntil: null
          }
        });

        return resolvedEntityId;
      });

      return options.resolveById(entityId);
    } catch (error) {
      await this.mark_idempotency_failed(idempotency.recordId, error);
      throw error;
    }
  }

  private async acquire_idempotency(
    scope: string,
    idempotencyKey: string,
    requestHash: string,
    canRetryOnConflict = true
  ): Promise<AcquiredIdempotencyRecord> {
    const existingRecord = await this.prismaService.systemIdempotencyRecord.findUnique({
      where: {
        scope_idempotencyKey: {
          scope,
          idempotencyKey
        }
      },
      select: {
        id: true,
        requestHash: true,
        status: true,
        lockedUntil: true,
        responseBody: true
      }
    });

    const now = new Date();
    const lockUntil = new Date(now.getTime() + 5 * 60 * 1000);
    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new ConflictException({
          code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
          message: "Idempotency key is already used with a different command payload"
        });
      }

      if (existingRecord.status === "COMPLETED") {
        return {
          recordId: existingRecord.id,
          replayed: true,
          responseBody: existingRecord.responseBody
        };
      }

      if (
        existingRecord.status === "STARTED" &&
        existingRecord.lockedUntil &&
        existingRecord.lockedUntil > now
      ) {
        throw new ConflictException({
          code: "CONFLICT",
          message: "Command with this Idempotency-Key is already in progress"
        });
      }

      const restarted = await this.prismaService.systemIdempotencyRecord.update({
        where: { id: existingRecord.id },
        data: {
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil,
          responseStatusCode: null,
          responseBody: Prisma.DbNull
        },
        select: {
          id: true
        }
      });

      return {
        recordId: restarted.id,
        replayed: false,
        responseBody: null
      };
    }

    try {
      const created = await this.prismaService.systemIdempotencyRecord.create({
        data: {
          scope,
          idempotencyKey,
          requestHash,
          status: to_prisma_enum<PrismaIdempotencyStatus>("started"),
          lockedUntil: lockUntil
        },
        select: {
          id: true
        }
      });

      return {
        recordId: created.id,
        replayed: false,
        responseBody: null
      };
    } catch (error) {
      if (canRetryOnConflict && is_unique_constraint_error(error)) {
        return this.acquire_idempotency(scope, idempotencyKey, requestHash, false);
      }
      throw error;
    }
  }

  private async mark_idempotency_failed(recordId: string, error: unknown): Promise<void> {
    await this.prismaService.systemIdempotencyRecord.update({
      where: {
        id: recordId
      },
      data: {
        status: to_prisma_enum<PrismaIdempotencyStatus>("failed"),
        responseStatusCode: resolve_error_status_code(error),
        responseBody: {
          message: error instanceof Error ? error.message : "Logistics resource command failed"
        },
        lockedUntil: null
      }
    });
  }

  private assert_command_access(actor: Pick<AuthPrincipal, "roleCodes">): void {
    const has_access = actor.roleCodes.some((roleCode) =>
      logistics_resource_command_roles.has(roleCode as "logistics" | "admin" | "ceo")
    );
    if (!has_access) {
      throw new ForbiddenException({
        code: "ACCESS_DENIED",
        message: "Logistics resource mutations are available only for logistics/admin/ceo"
      });
    }
  }

  private async assert_driver_exists(client: LogisticsDbClient, driverId: string): Promise<void> {
    const driver = await client.logisticsDriver.findFirst({
      where: { id: driverId },
      select: { id: true }
    });
    if (!driver) {
      throw new NotFoundException(`Driver '${driverId}' was not found`);
    }
  }

  private async assert_vehicle_exists(client: LogisticsDbClient, vehicleId: string): Promise<void> {
    const vehicle = await client.logisticsVehicle.findFirst({
      where: { id: vehicleId },
      select: { id: true }
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle '${vehicleId}' was not found`);
    }
  }

  private async assert_user_exists(client: LogisticsDbClient, userId: string): Promise<void> {
    const user = await client.usersUser.findFirst({
      where: { id: userId },
      select: { id: true }
    });
    if (!user) {
      throw new NotFoundException(`User '${userId}' was not found`);
    }
  }
}

function map_delivery_slot_read_model(record: LogisticsDeliverySlot): DeliverySlotReadModel {
  return {
    id: record.id,
    slotDate: to_iso_datetime(record.slotDate) ?? "",
    windowStart: to_iso_datetime(record.windowStart) ?? "",
    windowEnd: to_iso_datetime(record.windowEnd) ?? "",
    capacity: record.capacity,
    reservedCount: record.reservedCount,
    status: from_prisma_enum(record.status) as LogisticsSlotStatus,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_pickup_window_read_model(record: LogisticsPickupWindow): PickupWindowReadModel {
  return {
    id: record.id,
    windowDate: to_iso_datetime(record.windowDate) ?? "",
    windowStart: to_iso_datetime(record.windowStart) ?? "",
    windowEnd: to_iso_datetime(record.windowEnd) ?? "",
    capacity: record.capacity,
    reservedCount: record.reservedCount,
    status: from_prisma_enum(record.status) as LogisticsSlotStatus,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_driver_read_model(record: LogisticsDriver): DriverReadModel {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    phone: record.phone,
    isActive: record.isActive,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_vehicle_read_model(record: LogisticsVehicle): VehicleReadModel {
  return {
    id: record.id,
    plateNumber: record.plateNumber,
    name: record.name,
    capacityNotes: record.capacityNotes,
    isActive: record.isActive,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function map_route_day_read_model(record: LogisticsRouteDay): RouteDayReadModel {
  return {
    id: record.id,
    routeDate: to_iso_datetime(record.routeDate) ?? "",
    driverId: record.driverId,
    vehicleId: record.vehicleId,
    status: from_prisma_enum(record.status) as LogisticsRouteDayStatus,
    notes: record.notes,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? ""
  };
}

function normalize_create_delivery_slot_input(input: CreateDeliverySlotInput): {
  slotDate: Date;
  windowStart: Date;
  windowEnd: Date;
  capacity: number;
  status?: LogisticsSlotStatus;
} {
  return {
    slotDate: normalize_required_datetime_value(input.slotDate, "slotDate"),
    windowStart: normalize_required_datetime_value(input.windowStart, "windowStart"),
    windowEnd: normalize_required_datetime_value(input.windowEnd, "windowEnd"),
    capacity:
      input.capacity !== undefined ? normalize_positive_int(input.capacity, "capacity") : 1,
    ...(input.status !== undefined
      ? { status: normalize_slot_status_value(input.status) }
      : {})
  };
}

function normalize_patch_delivery_slot_input(input: PatchDeliverySlotInput): {
  slotDate?: Date;
  windowStart?: Date;
  windowEnd?: Date;
  capacity?: number;
  status?: LogisticsSlotStatus;
} {
  return {
    ...(input.slotDate !== undefined
      ? { slotDate: normalize_required_datetime_value(input.slotDate, "slotDate") }
      : {}),
    ...(input.windowStart !== undefined
      ? { windowStart: normalize_required_datetime_value(input.windowStart, "windowStart") }
      : {}),
    ...(input.windowEnd !== undefined
      ? { windowEnd: normalize_required_datetime_value(input.windowEnd, "windowEnd") }
      : {}),
    ...(input.capacity !== undefined
      ? { capacity: normalize_positive_int(input.capacity, "capacity") }
      : {}),
    ...(input.status !== undefined
      ? { status: normalize_slot_status_value(input.status) }
      : {})
  };
}

function normalize_create_pickup_window_input(input: CreatePickupWindowInput): {
  windowDate: Date;
  windowStart: Date;
  windowEnd: Date;
  capacity: number;
  status?: LogisticsSlotStatus;
} {
  return {
    windowDate: normalize_required_datetime_value(input.windowDate, "windowDate"),
    windowStart: normalize_required_datetime_value(input.windowStart, "windowStart"),
    windowEnd: normalize_required_datetime_value(input.windowEnd, "windowEnd"),
    capacity:
      input.capacity !== undefined ? normalize_positive_int(input.capacity, "capacity") : 1,
    ...(input.status !== undefined
      ? { status: normalize_slot_status_value(input.status) }
      : {})
  };
}

function normalize_patch_pickup_window_input(input: PatchPickupWindowInput): {
  windowDate?: Date;
  windowStart?: Date;
  windowEnd?: Date;
  capacity?: number;
  status?: LogisticsSlotStatus;
} {
  return {
    ...(input.windowDate !== undefined
      ? { windowDate: normalize_required_datetime_value(input.windowDate, "windowDate") }
      : {}),
    ...(input.windowStart !== undefined
      ? { windowStart: normalize_required_datetime_value(input.windowStart, "windowStart") }
      : {}),
    ...(input.windowEnd !== undefined
      ? { windowEnd: normalize_required_datetime_value(input.windowEnd, "windowEnd") }
      : {}),
    ...(input.capacity !== undefined
      ? { capacity: normalize_positive_int(input.capacity, "capacity") }
      : {}),
    ...(input.status !== undefined
      ? { status: normalize_slot_status_value(input.status) }
      : {})
  };
}

function normalize_create_driver_input(input: CreateDriverInput): {
  userId?: string | null;
  name: string;
  phone?: string | null;
  isActive: boolean;
} {
  return {
    ...(input.userId !== undefined ? { userId: normalize_nullable_uuid_value(input.userId) } : {}),
    name: normalize_required_text_value(input.name, "name", 255),
    ...(input.phone !== undefined ? { phone: normalize_optional_text_value(input.phone) } : {}),
    isActive: input.isActive ?? true
  };
}

function normalize_patch_driver_input(input: PatchDriverInput): {
  userId?: string | null;
  name?: string;
  phone?: string | null;
  isActive?: boolean;
} {
  return {
    ...(input.userId !== undefined ? { userId: normalize_nullable_uuid_value(input.userId) } : {}),
    ...(input.name !== undefined
      ? { name: normalize_required_text_value(input.name, "name", 255) }
      : {}),
    ...(input.phone !== undefined ? { phone: normalize_optional_text_value(input.phone) } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
  };
}

function normalize_create_vehicle_input(input: CreateVehicleInput): {
  plateNumber?: string | null;
  name: string;
  capacityNotes?: string | null;
  isActive: boolean;
} {
  return {
    ...(input.plateNumber !== undefined
      ? { plateNumber: normalize_optional_text_value(input.plateNumber) }
      : {}),
    name: normalize_required_text_value(input.name, "name", 255),
    ...(input.capacityNotes !== undefined
      ? { capacityNotes: normalize_optional_text_value(input.capacityNotes) }
      : {}),
    isActive: input.isActive ?? true
  };
}

function normalize_patch_vehicle_input(input: PatchVehicleInput): {
  plateNumber?: string | null;
  name?: string;
  capacityNotes?: string | null;
  isActive?: boolean;
} {
  return {
    ...(input.plateNumber !== undefined
      ? { plateNumber: normalize_optional_text_value(input.plateNumber) }
      : {}),
    ...(input.name !== undefined
      ? { name: normalize_required_text_value(input.name, "name", 255) }
      : {}),
    ...(input.capacityNotes !== undefined
      ? { capacityNotes: normalize_optional_text_value(input.capacityNotes) }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
  };
}

function normalize_create_route_day_input(input: CreateRouteDayInput): {
  routeDate: Date;
  driverId?: string | null;
  vehicleId?: string | null;
  status?: LogisticsRouteDayStatus;
  notes?: string | null;
} {
  return {
    routeDate: normalize_required_datetime_value(input.routeDate, "routeDate"),
    ...(input.driverId !== undefined ? { driverId: normalize_nullable_uuid_value(input.driverId) } : {}),
    ...(input.vehicleId !== undefined
      ? { vehicleId: normalize_nullable_uuid_value(input.vehicleId) }
      : {}),
    ...(input.status !== undefined
      ? { status: normalize_route_day_status_value(input.status) }
      : {}),
    ...(input.notes !== undefined ? { notes: normalize_optional_text_value(input.notes) } : {})
  };
}

function normalize_patch_route_day_input(input: PatchRouteDayInput): {
  routeDate?: Date;
  driverId?: string | null;
  vehicleId?: string | null;
  status?: LogisticsRouteDayStatus;
  notes?: string | null;
} {
  return {
    ...(input.routeDate !== undefined
      ? { routeDate: normalize_required_datetime_value(input.routeDate, "routeDate") }
      : {}),
    ...(input.driverId !== undefined ? { driverId: normalize_nullable_uuid_value(input.driverId) } : {}),
    ...(input.vehicleId !== undefined
      ? { vehicleId: normalize_nullable_uuid_value(input.vehicleId) }
      : {}),
    ...(input.status !== undefined
      ? { status: normalize_route_day_status_value(input.status) }
      : {}),
    ...(input.notes !== undefined ? { notes: normalize_optional_text_value(input.notes) } : {})
  };
}

function normalize_required_datetime_value(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be a valid ISO datetime`
    });
  }

  return parsed;
}

function normalize_positive_int(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} must be an integer > 0`
    });
  }

  return value;
}

function normalize_required_text_value(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} is required`
    });
  }

  if (normalized.length > maxLength) {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: `${field} length must be <= ${maxLength}`
    });
  }

  return normalized;
}

function normalize_optional_text_value(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalize_nullable_uuid_value(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalize_slot_status_value(value: string): LogisticsSlotStatus {
  if ((logistics_slot_statuses as readonly string[]).includes(value)) {
    return value as LogisticsSlotStatus;
  }

  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message: `status must be one of: ${logistics_slot_statuses.join(", ")}`
  });
}

function normalize_route_day_status_value(value: string): LogisticsRouteDayStatus {
  if ((logistics_route_day_statuses as readonly string[]).includes(value)) {
    return value as LogisticsRouteDayStatus;
  }

  throw new BadRequestException({
    code: "VALIDATION_ERROR",
    message: `status must be one of: ${logistics_route_day_statuses.join(", ")}`
  });
}

function build_command_request_hash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function resolve_id_from_response_body(payload: Prisma.JsonValue | null, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const raw = (payload as Record<string, unknown>)[key];
  if (typeof raw !== "string") {
    return null;
  }

  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolve_error_status_code(error: unknown): number {
  if (error instanceof NotFoundException) {
    return 404;
  }

  if (error instanceof ConflictException) {
    return 409;
  }

  if (error instanceof BadRequestException) {
    return 422;
  }

  return 500;
}

function is_unique_constraint_error(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "P2002";
}

function extract_eq_filter(query: ReadCollectionQueryInput, field: string): string | undefined {
  const filters = query.contract.filters ?? [];
  for (const filter of filters) {
    if (filter.field !== field || filter.operator !== "eq") {
      continue;
    }

    if (typeof filter.value !== "string") {
      continue;
    }

    const normalized = filter.value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
}

function extract_boolean_eq_filter(query: ReadCollectionQueryInput, field: string): boolean | undefined {
  const filters = query.contract.filters ?? [];
  for (const filter of filters) {
    if (filter.field !== field || filter.operator !== "eq") {
      continue;
    }

    if (typeof filter.value === "boolean") {
      return filter.value;
    }

    if (typeof filter.value === "string") {
      const normalized = filter.value.trim().toLowerCase();
      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }
    }
  }

  return undefined;
}
