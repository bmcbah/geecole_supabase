import { useId, type ReactNode } from "react";
import { Toolbar } from "primereact/toolbar";

type TablePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  alerts?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  /** @deprecated Use search and actions to preserve the shared toolbar layout. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

export function TablePanel({
  title,
  description,
  meta,
  alerts,
  search,
  actions,
  toolbar,
  children,
  className,
  contentClassName,
}: TablePanelProps) {
  const titleId = useId();
  const toolbarStart = toolbar ?? search;
  const toolbarEnd = toolbar ? undefined : actions;
  const hasToolbar = Boolean(toolbarStart || toolbarEnd);

  return (
    <section aria-labelledby={titleId} className={className}>
      <header className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={titleId}
            className="m-0 text-lg font-semibold leading-6 text-slate-900"
          >
            {title}
          </h2>
          {meta}
        </div>

        {description ? (
          <p className="mb-0 mt-0.5 text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </header>

      {alerts ? (
        <div className="mb-3 text-base [&_.p-message]:w-full">{alerts}</div>
      ) : null}

      {hasToolbar ? (
        <Toolbar
          start={toolbarStart}
          end={toolbarEnd}
          className="mb-3 min-h-0 rounded-none border-0 bg-transparent p-0"
        />
      ) : null}

      <div
        className={joinClassNames(
          "overflow-hidden rounded-lg border border-slate-200",
          "[&_.p-datatable]:border-0 [&_.p-datatable-wrapper]:border-0",
          "[&_.p-datatable-thead>tr>th]:px-3 [&_.p-datatable-thead>tr>th]:py-2",
          "[&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold",
          "[&_.p-datatable-tbody>tr>td]:px-3 [&_.p-datatable-tbody>tr>td]:py-2",
          "[&_.p-datatable-tbody>tr>td]:text-sm",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
