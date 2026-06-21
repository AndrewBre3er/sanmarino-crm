import { describe, expect, it } from "vitest";
import {
  integration_inbox_sources,
  integration_inbox_statuses,
  integrations_notifications_boundary_contract,
  integrations_notifications_command_contract,
  integrations_notifications_entities,
  integrations_notifications_event_contract,
  notification_dispatch_channels,
  notification_dispatch_statuses
} from "../../src/contracts/integrations-notifications.contract";

describe("integrations + notifications contract freeze", () => {
  it("keeps integration and notification entity scope fixed for Delta 0", () => {
    expect(integrations_notifications_entities).toEqual([
      "integration_inbox_event",
      "notification_dispatch"
    ]);
  });

  it("keeps accepted source, channel, and status contracts aligned", () => {
    expect(integration_inbox_sources).toEqual(["ats", "avito"]);
    expect(integration_inbox_statuses).toEqual(["received", "processed", "rejected"]);
    expect(notification_dispatch_channels).toEqual(["telegram", "max"]);
    expect(notification_dispatch_statuses).toEqual(["queued", "sent", "failed"]);
  });

  it("freezes inbound and outbound command endpoints", () => {
    expect(integrations_notifications_command_contract.receiveAtsEvent).toEqual({
      method: "POST",
      path: "/integrations/ats/events",
      requiresIdempotencyKey: true
    });
    expect(integrations_notifications_command_contract.receiveAvitoEvent).toEqual({
      method: "POST",
      path: "/integrations/avito/events",
      requiresIdempotencyKey: true
    });
    expect(integrations_notifications_command_contract.enqueueTelegramNotification).toEqual({
      method: "POST",
      path: "/notifications/telegram",
      requiresIdempotencyKey: true
    });
    expect(integrations_notifications_command_contract.enqueueMaxNotification).toEqual({
      method: "POST",
      path: "/notifications/max",
      requiresIdempotencyKey: true
    });
  });

  it("freezes traceable event surface without provider delivery", () => {
    expect(integrations_notifications_event_contract).toEqual({
      atsEventReceived: "integration.ats_event_received",
      avitoEventReceived: "integration.avito_event_received",
      telegramSent: "notification.telegram_sent",
      maxSent: "notification.max_sent"
    });
    expect(integrations_notifications_boundary_contract).toEqual({
      inboundDuplicateSuppression: "source_system_external_event_id",
      outboundRequiresDomainFact: true,
      providerDelivery: "deferred"
    });
  });
});
