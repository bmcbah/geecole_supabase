import type { ReactNode } from "react";

type PanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  alerts?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({
  title,
  description,
  meta,
  search,
  actions,
  alerts,
  children,
  className = "",
}: PanelProps) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
    >
      <header className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
              {meta}
            </div>
            {description && (
              <p className="mt-0.5 truncate text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>

          {(search || actions) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
              {search}
              {actions}
            </div>
          )}
        </div>
      </header>

      {alerts && (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          {alerts}
        </div>
      )}

      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
