import { Button } from "primereact/button";
import { Message } from "primereact/message";
import type { AcademicYear } from "../types/settings";
import { Panel } from "../../../shared/components/layout/Panel";

interface Props extends React.PropsWithChildren {
  title: string;
  description: string;
  year: AcademicYear | null;
  addLabel?: string;
  onAdd?: () => void;
  search?: React.ReactNode;
  meta?: React.ReactNode;
}

export function SettingsPanelShell({
  title,
  description,
  year,
  addLabel,
  onAdd,
  search,
  meta,
  children,
}: Props) {
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );

  const alerts = !year ? (
    <Message severity="warn" text="Créez ou sélectionnez une année scolaire." />
  ) : !editable ? (
    <Message
      severity="info"
      text={`${year.name} est clôturée et reste consultable en lecture seule.`}
    />
  ) : undefined;

  return (
    <Panel
      title={title}
      description={description}
      meta={meta}
      search={search}
      actions={
        addLabel && onAdd ? (
          <Button
            label={addLabel}
            icon="pi pi-plus"
            size="small"
            disabled={!editable}
            onClick={onAdd}
          />
        ) : undefined
      }
      alerts={alerts}
    >
      {year ? children : null}
    </Panel>
  );
}
