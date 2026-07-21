import { useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { NotesOperationsTable } from "../components/NotesOperationsTable";
import { useNotesOperationsPage } from "../hooks/useNotesOperationsPage";
import {
  completePostponedResult,
  type PostponedResultItem,
} from "../services/notes-operations.service";

export function PostponedResultsPage() {
  const page = useNotesOperationsPage("postponed");
  const [editing, setEditing] = useState<PostponedResultItem>();
  const [value, setValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"" | "absent" | "exempt">("");
  const [saving, setSaving] = useState(false);

  if (!page.yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await completePostponedResult({
        id: editing.id,
        value: status ? undefined : (value ?? undefined),
        status: status || undefined,
      });
      setEditing(undefined);
      await page.load();
    } catch (cause) {
      page.setError(
        cause instanceof Error ? cause.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NotesOperationsTable
        title="Rattrapages à compléter"
        description="Régularisez les résultats Reportés qui bloquent moyenne et bulletin."
        yearName={page.year?.name}
        rows={page.items}
        total={page.total}
        first={page.first}
        pageSize={page.pageSize}
        loading={page.loading}
        error={page.error}
        search={page.query}
        status={page.state}
        advanced={page.advanced}
        classId={page.classId}
        cycleId={page.cycleId}
        levelId={page.levelId}
        periodId={page.periodId}
        classOptions={page.classes.map((item) => ({
          label: item.name,
          value: item.id,
        }))}
        periodOptions={page.periods.map((item) => ({
          label: page.cycleId ? item.name : `${item.cycleName} — ${item.name}`,
          value: item.id,
        }))}
        cycleOptions={page.cycles.map((item) => ({
          label: item.name,
          value: item.id,
        }))}
        levelOptions={page.levels.map((item) => ({
          label: item.level_name_snapshot,
          value: item.id,
        }))}
        placeholder="Élève, matricule, matière ou évaluation"
        onReload={() => void page.load()}
        onSearch={(next) => {
          page.setFirst(0);
          page.setQuery(next);
        }}
        onClass={(next) => {
          page.setFirst(0);
          page.setClassId(next);
        }}
        onCycle={page.setCycleId}
        onLevel={page.setLevelId}
        onPeriod={(next) => {
          page.setFirst(0);
          page.setPeriodId(next);
        }}
        onAdvanced={() => page.setAdvanced((current) => !current)}
        onReset={page.reset}
        onPage={(event) => {
          page.setFirst(event.first);
          page.setPageSize(event.rows);
        }}
      >
        <Column field="studentName" header="Élève" />
        <Column field="matricule" header="Matricule" />
        <Column field="className" header="Classe" />
        <Column field="subjectName" header="Matière" />
        <Column field="noteLabel" header="Évaluation" />
        <Column
          header="Blocage"
          body={() => <Tag value="Moyenne + bulletin" severity="warning" />}
        />
        <Column
          header="Action"
          body={(row: PostponedResultItem) => (
            <Button
              label="Régulariser"
              icon="pi pi-pencil"
              size="small"
              text
              onClick={() => {
                setEditing(row);
                setValue(null);
                setStatus("");
              }}
            />
          )}
        />
      </NotesOperationsTable>
      <Dialog
        header="Régulariser le rattrapage"
        visible={Boolean(editing)}
        modal
        className="w-[min(92vw,34rem)]"
        onHide={() => setEditing(undefined)}
      >
        {editing ? (
          <div className="space-y-4">
            <Message
              severity="info"
              text={`${editing.studentName} · ${editing.subjectName} · ${editing.noteLabel}`}
            />
            <label className="field">
              <span>Résultat définitif</span>
              <InputNumber
                value={value}
                min={0}
                max={20}
                maxFractionDigits={2}
                suffix=" /20"
                disabled={Boolean(status)}
                onValueChange={(event) => setValue(event.value ?? null)}
              />
            </label>
            <label className="field">
              <span>Ou statut définitif</span>
              <Dropdown
                value={status}
                options={[
                  { label: "Aucun — saisir une note", value: "" },
                  { label: "Absent", value: "absent" },
                  { label: "Dispensé", value: "exempt" },
                ]}
                onChange={(event) => {
                  setStatus(event.value as typeof status);
                  if (event.value) setValue(null);
                }}
              />
            </label>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            label="Annuler"
            size="small"
            severity="secondary"
            outlined
            onClick={() => setEditing(undefined)}
          />
          <Button
            label="Enregistrer"
            size="small"
            icon="pi pi-check"
            loading={saving}
            disabled={value === null && !status}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </>
  );
}
