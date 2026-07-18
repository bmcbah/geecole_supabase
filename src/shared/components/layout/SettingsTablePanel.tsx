import type { ReactNode } from "react";

type SettingsTablePanelProps = {
  sectionHeader?: ReactNode;
  alert?: ReactNode;
  toolbar?: ReactNode;
  dataTable: ReactNode;
  className?: string;
  contentClassName?: string;
  activeCard?: boolean;
};

const joinClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

export function SettingsTablePanel({
  sectionHeader,
  alert,
  toolbar,
  dataTable,
  className,
  contentClassName,
  activeCard = true,
}: SettingsTablePanelProps) {
  return (
    <section
      className={joinClassNames(
        activeCard ? "overflow-hidden rounded-xl bg-white shadow-sm" : "",
        className,
      )}
    >
      {sectionHeader ? (
        <div className="border-slate-200 px-4 py-3">{sectionHeader}</div>
      ) : null}

      {alert ? (
        <div className="border-slate-200 bg-slate-50 px-4 py-3 text-sm [&_.p-message]:w-full">
          {alert}
        </div>
      ) : null}

      {toolbar ? (
        <div className="border-slate-200 px-4 py-3">{toolbar}</div>
      ) : null}

      <div
        className={joinClassNames(
          "overflow-hidden px-4 pb-3",
          "[&_.p-datatable]:border-0 [&_.p-datatable-wrapper]:border-0",
          "[&_.p-datatable-thead>tr>th]:px-3 [&_.p-datatable-thead>tr>th]:py-2",
          "[&_.p-datatable-thead>tr>th]:text-xs [&_.p-datatable-thead>tr>th]:font-semibold",
          "[&_.p-datatable-tbody>tr>td]:px-3 [&_.p-datatable-tbody>tr>td]:py-2",
          "[&_.p-datatable-tbody>tr>td]:text-sm",
          contentClassName,
        )}
      >
        {dataTable}
      </div>
    </section>
  );
}
