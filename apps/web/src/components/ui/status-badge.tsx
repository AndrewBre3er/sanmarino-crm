export type StatusBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const tone_map = new Map<string, StatusBadgeTone>([
  ["new", "info"],
  ["in_processing", "warning"],
  ["in_progress", "warning"],
  ["converted_to_order", "success"],
  ["cancelled", "danger"],
  ["assembling", "warning"],
  ["ready_for_partial_shipment", "info"],
  ["ready_for_shipment", "info"],
  ["partially_shipped", "warning"],
  ["shipped", "success"],
  ["not_scheduled", "neutral"],
  ["planned", "info"],
  ["assigned", "info"],
  ["in_transit", "warning"],
  ["scheduled", "info"],
  ["partially_delivered", "warning"],
  ["delivered", "success"],
  ["failed", "danger"],
  ["rescheduled", "warning"],
  ["formed", "info"],
  ["confirmed_by_supplier", "info"],
  ["confirmed", "info"],
  ["paid", "success"],
  ["stocked", "success"],
  ["created", "info"],
  ["processed", "warning"],
  ["closed", "neutral"],
  ["pending", "warning"],
  ["completed", "success"],
  ["refunded", "danger"],
  ["income", "success"],
  ["expense", "warning"],
  ["adjustment", "info"],
  ["on_control", "warning"],
  ["problem", "danger"]
]);

export function resolve_status_badge_tone(status: string): StatusBadgeTone {
  return tone_map.get(status.toLowerCase()) ?? "neutral";
}

interface StatusBadgeProps {
  label: string;
}

export function StatusBadge({ label }: StatusBadgeProps) {
  const tone = resolve_status_badge_tone(label);

  return (
    <span className={`bo-status-badge bo-status-${tone}`} aria-label={`status ${label}`}>
      {label}
    </span>
  );
}
