import { Button } from "primereact/button";
import type { WorkspaceAlert } from "../../types/workspace";
import { StatusBadge } from "./StatusBadge";

type AlertListProps = {
  items: WorkspaceAlert[];
  onOpen: (item: WorkspaceAlert) => void;
  emptyLabel?: string;
};

const toneBySeverity = {
  blocking: "danger",
  warning: "warning",
  information: "info",
} as const;

const labelBySeverity = {
  blocking: "Blocage",
  warning: "Avertissement",
  information: "Information",
} as const;

export function AlertList({
  items,
  onOpen,
  emptyLabel = "Aucune alerte à traiter.",
}: AlertListProps) {
  if (!items.length) {
    return (
      <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
        <div>
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <i className="pi pi-check" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {emptyLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div
          key={item.id}
          className="grid gap-3 px-4 py-4 sm:grid-cols-[150px_minmax(0,1fr)_56px_auto] sm:items-center"
        >
          <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-start">
            <StatusBadge
              label={labelBySeverity[item.severity]}
              tone={toneBySeverity[item.severity]}
            />
            <StatusBadge label={item.domain} tone="neutral" />
          </div>
          <div className="min-w-0">
            <strong className="block text-sm font-semibold text-slate-950">
              {item.title}
            </strong>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {item.description}
            </span>
          </div>
          <strong className="text-xl font-semibold text-slate-950">
            {item.count}
          </strong>
          <Button
            label="Ouvrir"
            icon="pi pi-arrow-right"
            iconPos="right"
            severity="secondary"
            text
            onClick={() => onOpen(item)}
          />
        </div>
      ))}
    </div>
  );
}
