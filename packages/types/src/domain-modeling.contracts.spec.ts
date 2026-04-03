import { describe, expect, it } from "vitest";
import {
  build_collection_resource_path,
  build_command_resource_path,
  build_entity_id_example,
  canonical_domain_modules,
  is_canonical_domain_module,
  is_valid_collection_resource_name,
  is_valid_command_name,
  is_valid_domain_event_name,
  is_valid_entity_id,
  next_entity_version,
  next_event_version,
  requires_soft_delete,
  soft_delete_applicability_matrix,
  to_entity_id_prefix
} from "./index.js";

describe("domain modeling contracts", () => {
  it("keeps canonical module list and alias-safe module checks", () => {
    expect(canonical_domain_modules).toContain("analytics");
    expect(is_canonical_domain_module("orders")).toBe(true);
    expect(is_canonical_domain_module("kpi")).toBe(false);
  });

  it("validates entity identity conventions", () => {
    const prefix = to_entity_id_prefix("ReturnRequest");
    const example = build_entity_id_example("ReturnRequest");
    expect(prefix).toBe("return_request");
    expect(is_valid_entity_id(example)).toBe(true);
    expect(is_valid_entity_id("bad-id")).toBe(false);
  });

  it("validates domain event naming and versioning helpers", () => {
    expect(is_valid_domain_event_name("order.confirmed")).toBe(true);
    expect(is_valid_domain_event_name("OrderConfirmed")).toBe(false);
    expect(next_event_version(1)).toBe(2);
  });

  it("keeps soft-delete matrix baseline", () => {
    expect(requires_soft_delete("orders.order")).toBe(true);
    expect(requires_soft_delete("system.outbox_record")).toBe(false);
    expect(soft_delete_applicability_matrix.required).toContain("payments.payment");
  });

  it("keeps API resource naming helpers consistent", () => {
    expect(is_valid_collection_resource_name("return-requests")).toBe(true);
    expect(is_valid_collection_resource_name("returnRequest")).toBe(false);
    expect(is_valid_command_name("confirm")).toBe(true);
    expect(is_valid_command_name("confirm_order")).toBe(false);
    expect(build_collection_resource_path("orders")).toBe("/orders");
    expect(build_command_resource_path("orders", "orderId", "confirm")).toBe(
      "/orders/{orderId}/confirm"
    );
  });

  it("keeps optimistic concurrency helper deterministic", () => {
    expect(next_entity_version(5)).toBe(6);
  });
});

