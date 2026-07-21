import { useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { NotesOperationsTable } from "../components/NotesOperationsTable";
import { useNotesOperationsPage } from "../hooks/useNotesOperationsPage";
import {
  updateAppreciation,
  type AppreciationItem,
} from "../services/notes-operations.service";

export function AppreciationsPage() {
  const page = useNotesOperationsPage("appreciations");
  const [editing, setEditing] = useState<AppreciationItem>();
  const [appreciation, setAppreciation] = useState("");
  const [saving, setSaving] = useState(false);

  if (!page.yearId)
    return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateAppreciation(editing, appreciation);
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
        title="Appréciations"
        description="Commentaire par élève et matière, affiché sur le bulletin."
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
        statusOptions={[
          { label: "Complétée", value: "complete" },
          { label: "Manquante", value: "missing" },
        ]}
        placeholder="Élève, matricule ou matière"
        onReload={() => void page.load()}
        onSearch={(next) => {
          page.setFirst(0);
          page.setQuery(next);
        }}
        onStatus={(next) => {
          page.setFirst(0);
          page.setState(next);
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
        <Column field="className" header="Classe" />
        <Column field="subjectName" header="Matière" />
        <Column
          header="État"
          body={(row: AppreciationItem) => (
            <Tag
              value={row.appreciation ? "Complétée" : "À saisir"}
              severity={row.appreciation ? "success" : "warning"}
            />
          )}
        />
        <Column
          field="appreciation"
          header="Appréciation du bulletin"
          body={(row: AppreciationItem) =>
            row.appreciation || (
              <span className="text-slate-400">Non renseignée</span>
            )
          }
        />
        <Column
          header="Action"
          body={(row: AppreciationItem) => (
            <Button
              label={row.appreciation ? "Modifier" : "Saisir"}
              icon="pi pi-pencil"
              size="small"
              text
              onClick={() => {
                setEditing(row);
                setAppreciation(row.appreciation);
              }}
            />
          )}
        />
      </NotesOperationsTable>
      <Dialog
        header={
          editing?.appreciation
            ? "Modifier l’appréciation"
            : "Saisir l’appréciation"
        }
        visible={Boolean(editing)}
        modal
        className="w-[min(92vw,34rem)]"
        onHide={() => setEditing(undefined)}
      >
        <label className="field">
          <span>Commentaire repris sur le bulletin</span>
          <InputTextarea
            value={appreciation}
            rows={5}
            maxLength={500}
            autoResize
            className="w-full"
            onChange={(event) => setAppreciation(event.target.value)}
          />
          <small>{appreciation.length}/500 caractères</small>
        </label>
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
            disabled={!appreciation.trim()}
            onClick={() => void save()}
          />
        </div>
      </Dialog>
    </>
  );
}
