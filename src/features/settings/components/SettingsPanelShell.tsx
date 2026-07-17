import { Button } from "primereact/button";
import { Message } from "primereact/message";
import type { AcademicYear } from "../types/settings";

interface Props extends React.PropsWithChildren {
  title: string;
  description: string;
  year: AcademicYear | null;
  addLabel?: string;
  onAdd?: () => void;
}
export function SettingsPanelShell({
  title,
  description,
  year,
  addLabel,
  onAdd,
  children,
}: Props) {
  const editable = Boolean(
    year && !["closed", "archived"].includes(year.status),
  );
  return (
    <section className="settings-panel-surface">
      <header className="settings-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {!year ? (
        <Message
          severity="warn"
          text="Créez ou sélectionnez une année scolaire."
        />
      ) : (
        <>
          {!editable && (
            <Message
              severity="info"
              text={`${year.name} est clôturée et reste consultable en lecture seule.`}
            />
          )}
          {addLabel && onAdd && (
            <div className="panel-toolbar panel-toolbar-end">
              <span />
              <Button
                label={addLabel}
                icon="pi pi-plus"
                disabled={!editable}
                onClick={onAdd}
              />
            </div>
          )}
          {children}
        </>
      )}
    </section>
  );
}
