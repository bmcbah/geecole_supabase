import { useId, type ReactNode } from "react";
import { Toolbar } from "primereact/toolbar";
import { PageHeader } from "./PageHeader";

type SettingsTablePanelProps = {
  sectionHeader?: ReactNode;
  alert?: ReactNode;
  toolbar?: ReactNode;
  dataTable?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;

  /** @deprecated Compose the header and pass it through sectionHeader. */
  title?: ReactNode;
  /** @deprecated Compose the header and pass it through sectionHeader. */
  description?: ReactNode;
  /** @deprecated Compose the header and pass it through sectionHeader. */
  meta?: ReactNode;
  /** @deprecated Compose the header and pass it through sectionHeader. */
  headerActions?: ReactNode;
  /** @deprecated Use alert. */
  alerts?: ReactNode;
  /** @deprecated Compose the toolbar and pass it through toolbar. */
  toolbarStart?: ReactNode;
  /** @deprecated Compose the toolbar and pass it through toolbar. */
  toolbarEnd?: ReactNode;
  /** @deprecated Compose the toolbar and pass it through toolbar. */
  search?: ReactNode;
  /** @deprecated Compose the toolbar and pass it through toolbar. */
  actions?: ReactNode;
};

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

export function SettingsTablePanel({
  sectionHeader,
  alert,
  toolbar,
  dataTable,
  children,
  className,
  contentClassName,
  title,
  description,
  meta,
  headerActions,
  alerts,
  toolbarStart,
  toolbarEnd,
  search,
  actions,
}: SettingsTablePanelProps) {
  const titleId = useId();
  const legacyHeader = title ? (
    <PageHeader
      title={<span id={titleId}>{title}</span>}
      description={description}
      meta={meta}
      actions={headerActions}
      headingAs="h2"
      compact
    />
  ) : null;
  const legacyToolbarStart = toolbarStart ?? search;
  const legacyToolbarEnd = toolbarEnd ?? actions;
  const legacyToolbar =
    legacyToolbarStart || legacyToolbarEnd ? (
      <Toolbar
        start={legacyToolbarStart}
        end={legacyToolbarEnd}
        className="min-h-0 rounded-none border-0 bg-transparent p-0"
      />
    ) : null;

  const headerSlot = sectionHeader ?? legacyHeader;
  const alertSlot = alert ?? alerts;
  const toolbarSlot = toolbar ?? legacyToolbar;
  const dataTableSlot = dataTable ?? children;

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={joinClassNames(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {headerSlot ? (
        <div className="border-b border-slate-200 px-4 py-3">
          {headerSlot}
        </div>
      ) : null}

      {alertSlot ? (
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base [&_.p-message]:w-full">
          {alertSlot}
        </div>
      ) : null}

      {toolbarSlot ? (
        <div className="border-b border-slate-200 px-4 py-3">
          {toolbarSlot}
        </div>
      ) : null}

      {dataTableSlot ? (
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
          {dataTableSlot}
        </div>
      ) : null}
    </section>
  );
}
