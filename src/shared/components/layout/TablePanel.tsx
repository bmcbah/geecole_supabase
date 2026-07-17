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
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
    >
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
            </div>
            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>
          {toolbar && (
            <div className="flex shrink-0 flex-wrap items-end gap-2 lg:justify-end">
              {toolbar}
            </div>
          )}
        </div>
      </div>

      {alerts && (
        <div className="space-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          {alerts}
        </div>
      )}

      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
