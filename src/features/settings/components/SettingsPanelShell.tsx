import { Button } from "primereact/button";
import { Card } from "primereact/card";
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
  const editable = year?.status === "preparation";
  return (
    <Card title={title} subTitle={description}>
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
              text={`${year.name} est consultable en lecture seule. Sélectionnez une année en préparation pour modifier ce paramétrage.`}
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
    </Card>
  );
}
