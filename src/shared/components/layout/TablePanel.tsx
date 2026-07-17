import type { ReactNode } from "react";

type TablePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  toolbar?: ReactNode;
  alerts?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function TablePanel({
  title,
  description,
  meta,
  toolbar,
  alerts,
  children,
  className = "",
}: TablePanelProps) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`.trim()}
    >
      <div className="flex min-h-12 flex-col gap-2 border-b border-slate-200 px-3 py-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="shrink-0 text-sm font-semibold text-slate-900">{title}</h2>
          {meta && <div className="flex shrink-0 items-center gap-1.5">{meta}</div>}
          {description && (
            <span className="min-w-0 truncate text-xs text-slate-500">
              {description}
            </span>
          )}
        </div>

        {toolbar && (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
            {toolbar}
          </div>
        )}
      </div>

      {alerts && (
        <div className="space-y-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {alerts}
        </div>
      )}

      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
