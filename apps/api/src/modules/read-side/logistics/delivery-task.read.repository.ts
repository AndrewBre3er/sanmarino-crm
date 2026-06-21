import { Inject, Injectable } from "@nestjs/common";
import type {
  DeliveryTaskStatus as PrismaDeliveryTaskStatus,
  LogisticsDeliveryTask,
  Prisma
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import type { DeliveryTaskStatus } from "../../transactional/shared/status.contract";
import type {
  ReadCollectionQueryInput,
  ReadCollectionResult
} from "../shared/read-model.contract";
import { build_page_pagination_meta } from "../shared/read-query.dto";
import { from_prisma_enum, to_iso_datetime, to_prisma_enum } from "../shared/prisma-read.mapper";
import type { DeliveryTaskReadScope } from "./delivery-task.read.scope";

export interface LogisticsDeliveryTaskReadModel {
  id: string;
  orderId: string;
  routeDayId: string | null;
  deliverySlotId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  status: DeliveryTaskStatus;
  sequenceNo: number | null;
  plannedDate: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  addressText: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface LogisticsDeliveryTaskReadRepositoryContract {
  list(
    query: ReadCollectionQueryInput,
    scope?: DeliveryTaskReadScope
  ): Promise<ReadCollectionResult<LogisticsDeliveryTaskReadModel>>;
  getById(taskId: string, scope?: DeliveryTaskReadScope): Promise<LogisticsDeliveryTaskReadModel | null>;
}

function map_delivery_task_read_model(record: LogisticsDeliveryTask): LogisticsDeliveryTaskReadModel {
  return {
    id: record.id,
    orderId: record.orderId,
    routeDayId: record.routeDayId,
    deliverySlotId: record.deliverySlotId,
    driverId: record.driverId,
    vehicleId: record.vehicleId,
    status: from_prisma_enum(record.status) as DeliveryTaskStatus,
    sequenceNo: record.sequenceNo,
    plannedDate: to_iso_datetime(record.plannedDate),
    deliveredAt: to_iso_datetime(record.deliveredAt),
    failureReason: record.failureReason,
    addressText: record.addressText,
    recipientName: record.recipientName,
    recipientPhone: record.recipientPhone,
    createdBy: record.createdBy,
    createdAt: to_iso_datetime(record.createdAt) ?? "",
    updatedAt: to_iso_datetime(record.updatedAt) ?? "",
    version: record.version
  };
}

@Injectable()
export class PrismaLogisticsDeliveryTaskReadRepository
  implements LogisticsDeliveryTaskReadRepositoryContract
{
  constructor(@Inject(PrismaService) private readonly prismaService: PrismaService) {}

  async list(
    query: ReadCollectionQueryInput,
    scope?: DeliveryTaskReadScope
  ): Promise<ReadCollectionResult<LogisticsDeliveryTaskReadModel>> {
    const and_clauses: Prisma.LogisticsDeliveryTaskWhereInput[] = [];

    if (query.search) {
      and_clauses.push({
        OR: [
        { addressText: { contains: query.search, mode: "insensitive" } },
        { recipientName: { contains: query.search, mode: "insensitive" } },
        { recipientPhone: { contains: query.search, mode: "insensitive" } }
        ]
      });
    }

    if (query.status && query.status.length > 0) {
      const mapped = query.status.map((value) =>
        to_prisma_enum<PrismaDeliveryTaskStatus>(value)
      );
      const [first_status] = mapped;
      if (mapped.length === 1 && first_status) {
        and_clauses.push({ status: first_status });
      } else {
        and_clauses.push({ status: { in: mapped } });
      }
    }

    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const where: Prisma.LogisticsDeliveryTaskWhereInput =
      and_clauses.length > 0 ? { AND: and_clauses } : {};

    const orderBy = {
      [query.sortField]: query.sortDirection
    } as Prisma.LogisticsDeliveryTaskOrderByWithRelationInput;

    const [items, totalItems] = await this.prismaService.$transaction([
      this.prismaService.logisticsDeliveryTask.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      this.prismaService.logisticsDeliveryTask.count({ where })
    ]);

    return {
      items: items.map(map_delivery_task_read_model),
      pagination: build_page_pagination_meta(totalItems, query.page, query.pageSize),
      ...(query.contract.filters ? { appliedFilters: query.contract.filters } : {}),
      ...(query.contract.sort ? { appliedSort: query.contract.sort } : {})
    };
  }

  async getById(taskId: string, scope?: DeliveryTaskReadScope): Promise<LogisticsDeliveryTaskReadModel | null> {
    const and_clauses: Prisma.LogisticsDeliveryTaskWhereInput[] = [{ id: taskId }];
    if (scope?.responsibleUserId) {
      and_clauses.push({
        order: {
          deal: {
            responsibleUserId: scope.responsibleUserId
          }
        }
      });
    }

    const task = await this.prismaService.logisticsDeliveryTask.findFirst({
      where: {
        AND: and_clauses
      }
    });

    return task ? map_delivery_task_read_model(task) : null;
  }
}
