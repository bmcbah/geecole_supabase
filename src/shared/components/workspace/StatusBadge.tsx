import { Tag } from "primereact/tag";

type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  icon?: string;
};

const severityByTone = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "danger",
  neutral: "secondary",
} as const;

export function StatusBadge({
  label,
  tone = "neutral",
  icon,
}: StatusBadgeProps) {
  return <Tag value={label} icon={icon} severity={severityByTone[tone]} />;
}
