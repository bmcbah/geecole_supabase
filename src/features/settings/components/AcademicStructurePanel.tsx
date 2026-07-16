import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import {
  DataTable,
  type DataTableSelectionSingleChangeEvent,
} from "primereact/datatable";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useToast } from "../../../shared/components/toast-context";
import {
  listAcademicStructure,
  saveCycle,
  saveLevel,
} from "../services/academic-structure.service";
import type { StructureItemInput } from "../schemas/academic-structure.schema";
import type { AcademicCycle, GradeLevel } from "../types/academic-structure";
import { StructureItemDialog } from "./StructureItemDialog";

interface Props {
  institutionId: string;
}
type DialogState = {
  kind: "cycle" | "niveau";
  item?: AcademicCycle | GradeLevel;
} | null;
const toInput = (
  item?: AcademicCycle | GradeLevel,
): StructureItemInput | undefined =>
  item
    ? {
        name: item.name,
        code: item.code,
        sortOrder: item.sort_order,
        isActive: item.is_active,
      }
    : undefined;

export function AcademicStructurePanel({ institutionId }: Props) {
  const notify = useToast();
  const [cycles, setCycles] = useState<AcademicCycle[]>([]);
  const [levels, setLevels] = useState<GradeLevel[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<AcademicCycle | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setFailure("");
    try {
      const data = await listAcademicStructure(institutionId);
      setCycles(data.cycles);
      setLevels(data.levels);
      setSelectedCycle(
        (current) =>
          data.cycles.find((item) => item.id === current?.id) ??
          data.cycles[0] ??
          null,
      );
    } catch {
      setFailure("Impossible de charger la structure scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const visibleLevels = useMemo(
    () => levels.filter((item) => item.cycle_id === selectedCycle?.id),
    [levels, selectedCycle],
  );
  const submit = async (input: StructureItemInput) => {
    if (!dialog) return;
    setSaving(true);
    try {
      if (dialog.kind === "cycle")
        await saveCycle(institutionId, input, dialog.item?.id);
      else if (selectedCycle)
        await saveLevel(
          institutionId,
          selectedCycle.id,
          input,
          dialog.item?.id,
        );
      setDialog(null);
      notify({ severity: "success", summary: "Structure enregistrée" });
      await load();
    } catch {
      notify({
        severity: "error",
        summary: "Enregistrement impossible",
        detail: "Le nom ou le code existe peut-être déjà.",
      });
    } finally {
      setSaving(false);
    }
  };
  const status = (item: AcademicCycle | GradeLevel) => (
    <Tag
      value={item.is_active ? "Actif" : "Inactif"}
      severity={item.is_active ? "success" : "secondary"}
    />
  );
  if (failure) return <Message severity="error" text={failure} />;
  return (
    <div className="structure-grid">
      <Card
        title="Cycles"
        subTitle="Sélectionnez un cycle pour gérer ses niveaux"
      >
        <div className="panel-toolbar">
          <span />
          <Button
            label="Ajouter un cycle"
            icon="pi pi-plus"
            size="small"
            onClick={() => setDialog({ kind: "cycle" })}
          />
        </div>
        <DataTable
          value={cycles}
          loading={loading}
          dataKey="id"
          selectionMode="single"
          selection={selectedCycle}
          onSelectionChange={(
            event: DataTableSelectionSingleChangeEvent<AcademicCycle[]>,
          ) => setSelectedCycle(event.value)}
          emptyMessage="Aucun cycle"
          stripedRows
        >
          <Column field="sort_order" header="#" />
          <Column field="name" header="Cycle" />
          <Column field="code" header="Code" />
          <Column header="Statut" body={status} />
          <Column
            header=""
            body={(item: AcademicCycle) => (
              <Button
                icon="pi pi-pencil"
                aria-label={`Modifier ${item.name}`}
                text
                onClick={(event) => {
                  event.stopPropagation();
                  setDialog({ kind: "cycle", item });
                }}
              />
            )}
          />
        </DataTable>
      </Card>
      <Card
        title={selectedCycle ? `Niveaux — ${selectedCycle.name}` : "Niveaux"}
        subTitle="Les niveaux sont ordonnés dans leur cycle"
      >
        <div className="panel-toolbar">
          <span />
          <Button
            label="Ajouter un niveau"
            icon="pi pi-plus"
            size="small"
            disabled={!selectedCycle}
            onClick={() => setDialog({ kind: "niveau" })}
          />
        </div>
        <DataTable
          value={visibleLevels}
          loading={loading}
          dataKey="id"
          emptyMessage={
            selectedCycle ? "Aucun niveau" : "Sélectionnez un cycle"
          }
          stripedRows
        >
          <Column field="sort_order" header="#" />
          <Column field="name" header="Niveau" />
          <Column field="code" header="Code" />
          <Column header="Statut" body={status} />
          <Column
            header=""
            body={(item: GradeLevel) => (
              <Button
                icon="pi pi-pencil"
                aria-label={`Modifier ${item.name}`}
                text
                onClick={() => setDialog({ kind: "niveau", item })}
              />
            )}
          />
        </DataTable>
      </Card>
      <StructureItemDialog
        kind={dialog?.kind ?? "cycle"}
        visible={Boolean(dialog)}
        loading={saving}
        initial={toInput(dialog?.item)}
        onHide={() => setDialog(null)}
        onSubmit={submit}
      />
    </div>
  );
}
