import type { ReactNode } from "react";
import { Button } from "primereact/button";
import { PageHeader } from "../../../shared/components/layout/PageHeader";

type SchoolingPanelProps = {
  title: ReactNode;
  path?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  alert?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
};

const joinClassNames = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");

export function SchoolingPanel({
  title,
  path = "Scolarité",
  description,
  meta,
  actions,
  alert,
  toolbar,
  children,
  backLabel = "Retour",
  onBack,
  className,
}: SchoolingPanelProps) {
  return (
    <section
      className={joinClassNames(
        "w-full space-y-4",
        "[&_.p-inputtext]:min-h-10 [&_.p-inputtext]:w-full [&_.p-inputtext]:rounded-md",
        "[&_.p-dropdown]:min-h-10 [&_.p-dropdown]:w-full [&_.p-dropdown]:rounded-md",
        "[&_.p-inputtextarea]:w-full [&_.p-inputtextarea]:rounded-md",
        "[&_.p-multiselect]:min-h-10 [&_.p-multiselect]:w-full [&_.p-multiselect]:rounded-md",
        "[&_.p-calendar]:w-full [&_.p-calendar_.p-inputtext]:rounded-md",
        "[&_.p-button]:min-h-10 [&_.p-button]:rounded-md",
        "[&_.p-datatable]:w-full",
        className,
      )}
    >
      <PageHeader
        eyebrow={path}
        title={title}
        description={description}
        meta={meta}
        actions={actions}
        backAction={
          onBack ? (
            <Button
              label={backLabel}
              icon="pi pi-arrow-left"
              text
              size="small"
              className="!min-h-8 !px-0"
              onClick={onBack}
            />
          ) : undefined
        }
      />
      {alert}
      {toolbar ? (
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          {toolbar}
        </section>
      ) : null}
      <div className="min-w-0 w-full">{children}</div>
    </section>
  );
}
