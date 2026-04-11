import { describe, expect, it } from "vitest";
import {
  orders_core_entities,
  orders_core_boundary_contract,
  orders_core_out_of_scope_contract,
  orders_core_read_side_contract,
  orders_core_status_contract
} from "../../src/contracts/orders-core.contract";
import {
  fulfillment_statuses,
  order_control_overlay_statuses,
  order_delivery_statuses,
  order_statuses
} from "../../src/modules/transactional/shared/status.contract";

describe("orders core contract freeze", () => {
  it("keeps Orders Step 1 entity scope fixed", () => {
    expect(orders_core_entities).toEqual(["order", "order_item", "fulfillment"]);
  });

  it("keeps Order/Fulfillment statuses aligned between API contract and transactional layer", () => {
    expect(orders_core_status_contract.order).toEqual(order_statuses);
    expect(orders_core_status_contract.controlOverlay).toEqual(order_control_overlay_statuses);
    expect(orders_core_status_contract.deliveryAggregation).toEqual(order_delivery_statuses);
    expect(orders_core_status_contract.fulfillment).toEqual(fulfillment_statuses);
  });

  it("freezes Orders Step 1 boundaries before backend implementation", () => {
    expect(orders_core_boundary_contract.canonicalCreationPath).toBe(
      "auto_create_from_deal_by_coverage_rules"
    );
    expect(orders_core_boundary_contract.creationImplementationPhase).toBe("orders-step-2");
    expect(orders_core_boundary_contract.initialStatus).toBe("assembling");
    expect(orders_core_boundary_contract.partialShipmentMustRemainInModel).toBe(true);
    expect(orders_core_boundary_contract.deliveryStatusIsAggregatedFromDeliveryTasks).toBe(true);
    expect(orders_core_boundary_contract.overlaysAreSeparatedFromMainStatus).toBe(true);
  });

  it("marks implemented vs deferred read-side boundaries for Orders Step 1", () => {
    expect(orders_core_read_side_contract.freezePhase).toBe("orders-step-1-contract-freeze");
    expect(orders_core_read_side_contract.implementedCollections).toEqual(["orders"]);
    expect(orders_core_read_side_contract.deferredCollections).toEqual(["fulfillments"]);
  });

  it("keeps non-orders flows explicitly out of scope for this freeze", () => {
    expect(orders_core_out_of_scope_contract.logisticsExecution).toBe("deferred");
    expect(orders_core_out_of_scope_contract.paymentsFlow).toBe("deferred");
    expect(orders_core_out_of_scope_contract.financeReflection).toBe("deferred");
    expect(orders_core_out_of_scope_contract.returnsFlow).toBe("deferred");
    expect(orders_core_out_of_scope_contract.workerReconciliationJobs).toBe("deferred");
    expect(orders_core_out_of_scope_contract.kpiAnalytics).toBe("deferred");
  });
});
