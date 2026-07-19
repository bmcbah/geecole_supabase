import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { supabase } from "../../../shared/lib/supabase/client";
import { createReportCards, listReportCards, publishReportCard } from "../services/notes-module.service";

type Option = { label: string; value: string };
type Card = { id: string; enrollment_id: string; version: number; status: "draft" | "published" | "cancelled"; snapshot: any; generated_at: string };

export function ReportCardsPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [classes, setClasses] = useState<Option[]>([]);
  const [periods, setPeriods] = useState<Option[]>([]);
  const [classId, setClassId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!year) return;
    void Promise.all([
      supabase.from("school_classes").select("id,name").eq("academic_year_id", year.id).eq("is_active", true).order("name"),
      supabase.from("academic_periods").select("id,name").eq("academic_year_id", year.id).order("sequence"),
    ]).then(([classResult, periodResult]) => {
      setClasses((classResult.data ?? []).map((item) => ({ label: item.name, value: item.id })));
      setPeriods((periodResult.data ?? []).map((item) => ({ label: item.name, value: item.id })));
    });
  }, [year]);

  const load = useCallback(async () => {
    if (!classId || !periodId) { setItems([]); return; }
    setItems(await listReportCards(periodId, classId) as Card[]);
  }, [classId, periodId]);
  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!year || !classId || !periodId) return;
    setLoading(true);
    try {
      const [{ data: deliberations, error: deliberationError }, { data: results, error: resultError }] = await Promise.all([
        supabase.from("deliberations").select("*").eq("academic_period_id", periodId).eq("class_id", classId),
        supabase.from("period_subject_results").select("*,annual_subjects(subject_name_snapshot)").eq("academic_period_id", periodId).eq("class_id", classId).eq("status", "validated"),
      ]);
      if (deliberationError || resultError) throw deliberationError ?? resultError;
      const existingVersions = new Map<string, number>();
      for (const item of items) existingVersions.set(item.enrollment_id, Math.max(existingVersions.get(item.enrollment_id) ?? 0, item.version));
      const resultsByEnrollment = new Map<string, any[]>();
      for (const result of results ?? []) resultsByEnrollment.set(result.enrollment_id, [...(resultsByEnrollment.get(result.enrollment_id) ?? []), { subject: result.annual_subjects?.subject_name_snapshot, result: result.result, comment: result.teacher_comment, variables: result.variables, formula_id: result.grading_formula_id, formula_version: result.grading_formula_version }]);
      const rows = (deliberations ?? []).map((decision) => ({
        institution_id: institutionId,
        academic_year_id: year.id,
        academic_period_id: periodId,
        class_id: classId,
        enrollment_id: decision.enrollment_id,
        version: (existingVersions.get(decision.enrollment_id) ?? 0) + 1,
        status: "draft",
        snapshot: {
          generated_on: new Date().toISOString(),
          academic_year: year.name,
          decision: decision.decision,
          general_average: decision.general_average,
          rank: decision.rank,
          mention: decision.mention,
          council_comment: decision.council_comment,
          subjects: resultsByEnrollment.get(decision.enrollment_id) ?? [],
        },
      }));
      if (!rows.length) throw new Error("Aucune délibération enregistrée pour cette classe et cette période.");
      await createReportCards(rows);
      await load();
      notify({ severity: "success", summary: `${rows.length} bulletin(s) généré(s)` });
    } catch (error) { notify({ severity: "error", summary: "Génération impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" }); }
    finally { setLoading(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;
  return <div className="space-y-4">
    <PageHeader title="Bulletins" description="Générez des instantanés versionnés à partir des résultats validés et des décisions de délibération." meta={<Tag value={year.name} severity="info" />} />
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<div className="flex gap-2"><Dropdown value={classId} options={classes} placeholder="Classe" onChange={(event) => setClassId(event.value)} /><Dropdown value={periodId} options={periods} placeholder="Période" onChange={(event) => setPeriodId(event.value)} /></div>} end={<Button label="Générer les bulletins" icon="pi pi-file" loading={loading} disabled={!classId || !periodId} onClick={() => void generate()} />} />
      {!classId || !periodId ? <div className="p-4"><Message severity="secondary" text="Choisissez une classe et une période." /></div> : <DataTable value={items} dataKey="id" size="small" stripedRows emptyMessage="Aucun bulletin généré">
        <Column field="enrollment_id" header="Inscription" />
        <Column field="version" header="Version" body={(row: Card) => `v${row.version}`} />
        <Column header="Moyenne" body={(row: Card) => row.snapshot?.general_average ?? "—"} />
        <Column header="Rang" body={(row: Card) => row.snapshot?.rank ?? "—"} />
        <Column header="Décision" body={(row: Card) => row.snapshot?.decision ?? "—"} />
        <Column header="Statut" body={(row: Card) => <Tag value={row.status === "published" ? "Publié" : row.status === "cancelled" ? "Annulé" : "Brouillon"} severity={row.status === "published" ? "success" : row.status === "cancelled" ? "danger" : "secondary"} />} />
        <Column header="Généré le" body={(row: Card) => new Date(row.generated_at).toLocaleString("fr-GN")} />
        <Column header="Actions" bodyClassName="text-right" body={(row: Card) => row.status === "draft" ? <Button label="Publier" icon="pi pi-check" text onClick={() => void publishReportCard(row.id).then(load)} /> : null} />
      </DataTable>}
    </section>
  </div>;
}
