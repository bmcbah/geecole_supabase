import type { ReactNode } from "react";

type AdvancedFilterPanelProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
};

export function AdvancedFilterPanel({
  title = "Filtres avancés",
  description,
  icon,
  children,
}: AdvancedFilterPanelProps) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-sm font-semibold text-slate-900">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {icon ? <div className="shrink-0">{icon}</div> : null}
      </div>
      {children}
    </div>
  );
}
