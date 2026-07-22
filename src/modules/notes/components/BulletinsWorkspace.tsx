import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable, type DataTablePageEvent } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { supabase } from "../../../shared/lib/supabase/client";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { NotesDataTableToolbar } from "./NotesDataTableToolbar";
import { changeBulletinStatus, listBulletins, type BulletinRow } from "../services/bulletins.service";

export type BulletinWorkspaceMode = "bulletins" | "validation" | "publication" | "historique";
type Option = { id: string; name: string };

const labels: Record<BulletinRow["status"], string> = {
  generated: "Généré",
  pending_validation: "À valider",
  validated: "Validé",
  published: "Publié",
  rejected: "Rejeté",
  replaced: "Remplacé",
};

const config: Record<BulletinWorkspaceMode, [string, string]> = {
  bulletins: ["Bulletins", "Consultez les bulletins générés et leur état."],
  validation: ["Validation", "Contrôlez puis validez ou rejetez les bulletins générés."],
  publication: ["Publication", "Publiez uniquement les bulletins validés."],
  historique: ["Historique", "Retrouvez toutes les versions et décisions."],
};

export function BulletinsWorkspace({ mode }: { mode: BulletinWorkspaceMode }) {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<BulletinRow[]>([]);
  const [selected, setSelected] = useState<BulletinRow[]>([]);
  const [total, setTotal] = useState(0);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [classes, setClasses] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [preview, setPreview] = useState<BulletinRow | null>(null);
  const [rejecting, setRejecting] = useState<BulletinRow | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const statuses = mode === "validation"
    ? (["generated", "pending_validation"] as BulletinRow["status"][])
    : mode === "publication"
      ? (["validated"] as BulletinRow["status"][])
      : undefined;

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setError("");
    try {
      const page = await listBulletins(institutionId, yearId, {
        first,
        rows,
        search: query,
        status: statuses ? undefined : status,
        statuses,
        classId,
        periodId,
        sortField: "createdAt",
        sortOrder: -1,
      });
      setItems(page.rows);
      setTotal(page.total);
      setSelected([]);
    } catch {
      setError("Impossible de charger les bulletins.");
    } finally {
      setLoading(false);
    }
  }, [classId, first, institutionId, mode, periodId, query, rows, status, yearId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!institutionId || !yearId) return;
    let cancelled = false;
    void Promise.all([
      supabase.from("school_classes").select("id,name").eq("institution_id", institutionId).eq("academic_year_id", yearId).eq("is_active", true).order("name"),
      supabase.from("academic_periods").select("id,name").eq("institution_id", institutionId).eq("academic_year_id", yearId).order("sequence"),
    ]).then(([classResult, periodResult]) => {
      if (cancelled) return;
      if (classResult.error || periodResult.error) {
        setError("Impossible de charger les filtres.");
        return;
      }
      setClasses(classResult.data ?? []);
      setPeriods(periodResult.data ?? []);
    });
    return () => { cancelled = true; };
  }, [institutionId, yearId]);

  async function updateOne(row: BulletinRow, next: BulletinRow["status"], comment?: string) {
    setProcessing(true);
    setError("");
    try {
      await changeBulletinStatus(row.id, next, comment);
      setRejecting(null);
      setReason("");
      setSuccess("Action appliquée avec succès.");
      await load();
    } catch {
      setError("Cette action n’a pas pu être appliquée.");
    } finally {
      setProcessing(false);
    }
  }

  async function updateBatch(next: "validated" | "published") {
    if (!selected.length) return;
    if (!window.confirm(`Confirmer le traitement de ${selected.length} bulletin(s) ?`)) return;
    setProcessing(true);
    setError("");
    setSuccess("");
    const results = await Promise.allSettled(selected.map((row) => changeBulletinStatus(row.id, next)));
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed) setError(`${failed} bulletin(s) n’ont pas pu être traités.`);
    if (selected.length - failed) setSuccess(`${selected.length - failed} bulletin(s) traité(s).`);
    setProcessing(false);
    await load();
  }

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  const selectable = mode === "validation" || mode === "publication";
  const [title, description] = config[mode];

  return <div className="space-y-4 pb-8">
    <PageHeader eyebrow="Notes & Bulletins" title={title} description={`${description} · ${year?.name ?? "Année"}`} actions={<div className="flex gap-2">
      {mode === "validation" ? <Button label={`Valider la sélection (${selected.length})`} icon="pi pi-check" disabled={!selected.length} loading={processing} onClick={() => void updateBatch("validated")} /> : null}
      {mode === "publication" ? <Button label={`Publier la sélection (${selected.length})`} icon="pi pi-send" disabled={!selected.length} loading={processing} onClick={() => void updateBatch("published")} /> : null}
      <Button label="Actualiser" icon="pi pi-refresh" severity="secondary" outlined onClick={() => void load()} />
    </div>} />
    {error ? <Message severity="error" text={error} /> : null}
    {success ? <Message severity="success" text={success} /> : null}
    <NotesDataTableToolbar search={query} onSearch={(value) => { setFirst(0); setQuery(value); }} advanced={advanced} onAdvanced={() => setAdvanced((value) => !value)} onReset={() => { setQuery(""); setStatus(""); setClassId(""); setPeriodId(""); setFirst(0); }} activeCount={[query, status, classId, periodId].filter(Boolean).length} status={status} onStatus={statuses ? undefined : setStatus} statusOptions={Object.entries(labels).map(([value, label]) => ({ value, label }))} classId={classId} onClass={setClassId} classOptions={classes.map((item) => ({ label: item.name, value: item.id }))} periodId={periodId} onPeriod={setPeriodId} periodOptions={periods.map((item) => ({ label: item.name, value: item.id }))} dateFrom="" onDateFrom={() => undefined} dateTo="" onDateTo={() => undefined} placeholder="Élève, nom ou matricule" />
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <DataTable value={items} lazy loading={loading} dataKey="id" paginator first={first} rows={rows} totalRecords={total} rowsPerPageOptions={[10, 25, 50]} selection={selectable ? selected : undefined} onSelectionChange={selectable ? (event) => setSelected(event.value as BulletinRow[]) : undefined} onPage={(event: DataTablePageEvent) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Aucun bulletin">
        {selectable ? <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} /> : null}
        <Column field="studentName" header="Élève" body={(row: BulletinRow) => <div><strong>{row.studentName}</strong><span className="block text-xs text-slate-400">{row.matricule}</span></div>} />
        <Column field="className" header="Classe" />
        <Column field="periodName" header="Période" />
        <Column field="status" header="État" body={(row: BulletinRow) => <Tag value={labels[row.status]} />} />
        <Column header="Actions" body={(row: BulletinRow) => <div className="flex gap-1">
          <Button icon="pi pi-eye" text rounded aria-label="Aperçu" onClick={() => setPreview(row)} />
          {mode === "validation" ? <><Button label="Valider" text onClick={() => void updateOne(row, "validated")} /><Button label="Rejeter" severity="danger" text onClick={() => setRejecting(row)} /></> : null}
          {mode === "publication" ? <Button label="Publier" text onClick={() => void updateOne(row, "published")} /> : null}
        </div>} />
      </DataTable>
    </section>
    <Dialog header={preview ? `Bulletin de ${preview.studentName}` : "Aperçu"} visible={!!preview} modal className="form-dialog form-dialog-wide" onHide={() => setPreview(null)}>{preview ? <pre className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-4 text-xs">{JSON.stringify(preview.snapshot, null, 2)}</pre> : null}</Dialog>
    <Dialog header="Rejeter le bulletin" visible={!!rejecting} modal className="form-dialog" onHide={() => setRejecting(null)}><InputTextarea value={reason} rows={4} autoResize className="w-full" onChange={(event) => setReason(event.target.value)} /><div className="mt-4 flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setRejecting(null)} /><Button label="Confirmer le rejet" severity="danger" disabled={reason.trim().length < 3} loading={processing} onClick={() => rejecting && void updateOne(rejecting, "rejected", reason.trim())} /></div></Dialog>
  </div>;
}
