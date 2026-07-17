import type { ReactNode } from "react";
import { Toolbar } from "primereact/toolbar";

type TablePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  /** @deprecated Prefer search and actions so the toolbar stays aligned. */
  toolbar?: ReactNode;
  alerts?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function TablePanel({
  title,
  description,
  meta,
  search,
  actions,
  toolbar,
  alerts,
  children,
  className = "",
  contentClassName = "",
}: TablePanelProps) {
  const hasToolbar = Boolean(toolbar || search || actions);

  return (
    <section className={`bg-white ${className}`.trim()}>
      <header className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-lg font-semibold leading-6 text-slate-900">
            {title}
          </h2>
          {meta}
        </div>
        {description && (
          <p className="mb-0 mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </header>

      {alerts && (
        <div className="mb-3 text-base [&_.p-message]:w-full">{alerts}</div>
      )}

      {hasToolbar && (
        <Toolbar
          start={toolbar ?? search}
          end={toolbar ? undefined : actions}
          className="mb-3 rounded-none border-0 bg-transparent p-0"
        />
      )}

      <div
        className={`overflow-hidden rounded-lg border border-slate-200 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </section>
  );
}
