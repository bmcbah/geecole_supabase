import { useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
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
        <Column
          field="studentName"
          header="Élève"
          body={(row: AppreciationItem) => (
            <div>
              <strong className="block text-sm font-semibold text-slate-900">
                {row.studentName}
              </strong>
              <span className="text-xs text-slate-400">{row.className}</span>
            </div>
          )}
        />
        <Column
          field="subjectName"
          header="Matière"
          body={(row: AppreciationItem) => (
            <span className="font-medium text-slate-700">{row.subjectName}</span>
          )}
        />
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
            row.appreciation ? (
              <p className="m-0 max-w-2xl text-sm leading-6 text-slate-600">
                {row.appreciation}
              </p>
            ) : (
              <span className="text-sm text-slate-400">Non renseignée</span>
            )
          }
        />
        <Column
          header=""
          body={(row: AppreciationItem) => (
            <div className="flex justify-end">
              <Button
                label={row.appreciation ? "Modifier" : "Saisir"}
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                outlined
                onClick={() => {
                  setEditing(row);
                  setAppreciation(row.appreciation);
                }}
              />
            </div>
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
        className="w-[min(94vw,38rem)]"
        onHide={() => setEditing(undefined)}
      >
        {editing ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start gap-3">
                <MetricIcon icon="pi-user" />
                <div className="min-w-0">
                  <strong className="block text-sm font-semibold text-slate-950">
                    {editing.studentName}
                  </strong>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {editing.className} · {editing.subjectName}
                  </span>
                </div>
              </div>
            </section>

            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Commentaire repris sur le bulletin
              </span>
              <InputTextarea
                value={appreciation}
                rows={6}
                maxLength={500}
                autoResize
                className="w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm transition-colors hover:border-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="Saisissez une appréciation claire, factuelle et constructive."
                onChange={(event) => setAppreciation(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>Cette appréciation apparaîtra sur le bulletin.</span>
                <span className="font-medium">{appreciation.length}/500</span>
              </div>
            </label>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button
                label="Annuler"
                size="small"
                severity="secondary"
                text
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
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
