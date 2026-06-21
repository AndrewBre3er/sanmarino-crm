export const integration_inbox_sources = ["ats", "avito"] as const;
export type IntegrationInboxSource = (typeof integration_inbox_sources)[number];

export const integration_inbox_statuses = ["received", "processed", "rejected"] as const;
export type IntegrationInboxStatus = (typeof integration_inbox_statuses)[number];

export const notification_dispatch_channels = ["telegram", "max"] as const;
export type NotificationDispatchChannel = (typeof notification_dispatch_channels)[number];

export const notification_dispatch_statuses = ["queued", "sent", "failed"] as const;
export type NotificationDispatchStatus = (typeof notification_dispatch_statuses)[number];

export const integrations_notifications_entities = [
  "integration_inbox_event",
  "notification_dispatch"
] as const;

export const integrations_notifications_command_contract = {
  receiveAtsEvent: {
    method: "POST",
    path: "/integrations/ats/events",
    requiresIdempotencyKey: true
  },
  receiveAvitoEvent: {
    method: "POST",
    path: "/integrations/avito/events",
    requiresIdempotencyKey: true
  },
  enqueueTelegramNotification: {
    method: "POST",
    path: "/notifications/telegram",
    requiresIdempotencyKey: true
  },
  enqueueMaxNotification: {
    method: "POST",
    path: "/notifications/max",
    requiresIdempotencyKey: true
  }
} as const;

export const integrations_notifications_event_contract = {
  atsEventReceived: "integration.ats_event_received",
  avitoEventReceived: "integration.avito_event_received",
  telegramSent: "notification.telegram_sent",
  maxSent: "notification.max_sent"
} as const;

export const integrations_notifications_boundary_contract = {
  inboundDuplicateSuppression: "source_system_external_event_id",
  outboundRequiresDomainFact: true,
  providerDelivery: "deferred"
} as const;
