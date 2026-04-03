export type StatusBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const tone_map = new Map<string, StatusBadgeTone>([
  ["draft", "neutral"],
  ["qualified", "info"],
  ["proposal", "info"],
  ["negotiation", "warning"],
  ["won", "success"],
  ["lost", "danger"],
  ["confirmed", "info"],
  ["reserved", "warning"],
  ["in_progress", "warning"],
  ["completed", "success"],
  ["closed", "neutral"],
  ["cancelled", "danger"],
  ["pending", "warning"],
  ["refunded", "danger"],
  ["scheduled", "info"],
  ["partially_delivered", "warning"],
  ["delivered", "success"],
  ["failed", "danger"],
  ["submitted", "info"],
  ["approved", "success"],
  ["rejected", "danger"],
  ["processed", "warning"]
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
