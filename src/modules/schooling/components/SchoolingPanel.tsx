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
    <section className={joinClassNames("space-y-4", className)}>
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
              className="!px-0"
              onClick={onBack}
            />
          ) : undefined
        }
      />

      {alert}
      {toolbar ? <div className="border-b border-slate-200 pb-3">{toolbar}</div> : null}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
