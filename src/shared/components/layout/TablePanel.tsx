import { useId, type ReactNode } from "react";
import { Card } from "primereact/card";
import { Toolbar } from "primereact/toolbar";
import { PageHeader } from "./PageHeader";

type TablePanelProps = {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  headerActions?: ReactNode;
  alerts?: ReactNode;
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
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
  headerActions,
  alerts,
  toolbarStart,
  toolbarEnd,
  search,
  actions,
  toolbar,
  children,
  className,
  contentClassName,
}: TablePanelProps) {
  const titleId = useId();
  const start = toolbar ?? toolbarStart ?? search;
  const end = toolbar ? undefined : (toolbarEnd ?? actions);
  const hasToolbar = Boolean(start || end);

  return (
    <Card
      className={joinClassNames(
        "overflow-hidden rounded-xl border border-slate-200 shadow-sm",
        "[&_.p-card-body]:p-0 [&_.p-card-content]:p-0",
        className,
      )}
    >
      <section aria-labelledby={titleId}>
        <PageHeader
          title={<span id={titleId}>{title}</span>}
          description={description}
          meta={meta}
          actions={headerActions}
          headingAs="h2"
          compact
          className="px-4 pt-4"
        />

        {alerts ? (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base [&_.p-message]:w-full">
            {alerts}
          </div>
        ) : null}

        {hasToolbar ? (
          <Toolbar
            start={start}
            end={end}
            className="min-h-0 rounded-none border-0 border-b border-slate-200 bg-white px-4 py-3"
          />
        ) : null}

        <div
          className={joinClassNames(
            "overflow-hidden",
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
    </Card>
  );
}
