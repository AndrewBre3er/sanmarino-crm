import { describe, expect, it, vi } from "vitest";
import type { ReadCollectionQueryInput } from "../../src/modules/read-side/shared/read-model.contract";
import type { PrismaAnalyticsKpiReadRepository } from "../../src/modules/analytics/kpi-read.repository";
import {
  ListDepartmentPlansUseCase,
  ListLiveKpiMetricsUseCase,
  ListSnapshotKpiMetricsUseCase
} from "../../src/modules/analytics/kpi-read.use-cases";

function build_query(): ReadCollectionQueryInput {
  return {
    page: 1,
    pageSize: 20,
    includeDeleted: false,
    sortField: "metricKey",
    sortDirection: "asc",
    contract: {
      pagination: {
        mode: "page",
        page: {
          page: 1,
          pageSize: 20
        }
      },
      filters: [
        {
          field: "metricKey",
          operator: "eq",
          value: "cash_revenue"
        }
      ],
      sort: [{ field: "metricKey", direction: "asc" }]
    }
  };
}

function build_repository(): PrismaAnalyticsKpiReadRepository {
  return {
    listLive: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    }),
    listSnapshots: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    }),
    listDepartmentPlans: vi.fn().mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
    })
  } as unknown as PrismaAnalyticsKpiReadRepository;
}

describe("KPI read use-cases", () => {
  it("delegates live KPI reads only to the analytics KPI repository", async () => {
    const repository = build_repository();
    const useCase = new ListLiveKpiMetricsUseCase(repository);
    const query = build_query();

    await useCase.execute(query);

    expect(repository.listLive).toHaveBeenCalledOnce();
    expect(repository.listLive).toHaveBeenCalledWith(query);
    expect(repository.listSnapshots).not.toHaveBeenCalled();
    expect(repository.listDepartmentPlans).not.toHaveBeenCalled();
  });

  it("delegates snapshot KPI reads only to the analytics KPI repository", async () => {
    const repository = build_repository();
    const useCase = new ListSnapshotKpiMetricsUseCase(repository);
    const query = build_query();

    await useCase.execute(query);

    expect(repository.listSnapshots).toHaveBeenCalledOnce();
    expect(repository.listSnapshots).toHaveBeenCalledWith(query);
    expect(repository.listLive).not.toHaveBeenCalled();
    expect(repository.listDepartmentPlans).not.toHaveBeenCalled();
  });

  it("delegates department plan reads only to the analytics KPI repository", async () => {
    const repository = build_repository();
    const useCase = new ListDepartmentPlansUseCase(repository);
    const query = build_query();

    await useCase.execute(query);

    expect(repository.listDepartmentPlans).toHaveBeenCalledOnce();
    expect(repository.listDepartmentPlans).toHaveBeenCalledWith(query);
    expect(repository.listLive).not.toHaveBeenCalled();
    expect(repository.listSnapshots).not.toHaveBeenCalled();
  });
});
