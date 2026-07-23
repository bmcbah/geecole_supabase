import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { batchReenrollStudents, getReenrollmentPolicy, type BatchReenrollmentResult } from "../services/reenrollment.service";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

export function BatchReenrollmentPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const { institutionId, yearId, years, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selected, setSelected] = useState<StudentListItem[]>([]);
  const [sourceYearId, setSourceYearId] = useState("");
  const [query, setQuery] = useState("");
  const [allowed, setAllowed] = useState(true);
  const [resultStatus, setResultStatus] = useState("draft");
  const [results, setResults] = useState<BatchReenrollmentResult[]>([]);
  const [loading, setLoading] = useState(false);

  const sourceYears = useMemo(() => years.filter((item) => item.id !== yearId), [yearId, years]);
  useEffect(() => setSourceYearId((current) => current || sourceYears[0]?.id || ""), [sourceYears]);

  useEffect(() => {
    if (!institutionId || !yearId || !sourceYearId) return;
    void Promise.all([
      listStudents(institutionId, sourceYearId),
      listStudents(institutionId, yearId),
      getReenrollmentPolicy(institutionId),
    ]).then(([previousStudents, currentStudents, policy]) => {
      const alreadyEnrolled = new Set(currentStudents.map((item) => item.id));
      setStudents(previousStudents.filter((item) => item.status === "confirmed" && !alreadyEnrolled.has(item.id)));
      setAllowed(policy.allow_batch);
      setResultStatus(policy.batch_result_status);
      setSelected([]);
    });
  }, [institutionId, sourceYearId, yearId]);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return students.filter((item) => !normalized || `${item.firstName} ${item.lastName} ${item.matricule} ${item.levelName}`.toLocaleLowerCase("fr").includes(normalized));
  }, [query, students]);
  const created = results.filter((item) => item.status === "created").length;

  return (
    <section className="medium-controls space-y-4">
      <PageHeader
        eyebrow={`Scolarité${year?.name ? ` · ${year.name}` : ""}`}
        title="Réinscriptions"
        description="Retrouvez les élèves d’une année antérieure qui ne sont pas encore inscrits dans l’année active."
        meta={<span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">{selected.length} sélectionné(s)</span>}
        actions={<Button label="Retour aux élèves" icon="pi pi-arrow-left" text size="small" onClick={() => void navigate("/scolarite/eleves")} />}
      />
      {!allowed ? <Message severity="warn" text="La réinscription groupée est désactivée dans les règles de l’établissement." /> : null}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="field min-w-56"><span>Année antérieure</span><Dropdown value={sourceYearId} options={sourceYears} optionLabel="name" optionValue="id" placeholder="Choisir l’année source" onChange={(event) => setSourceYearId(String(event.value))} /></label>
        <span className="p-input-icon-left min-w-64 flex-1"><i className="pi pi-search" /><InputText className="w-full" value={query} placeholder="Rechercher un ancien élève" onChange={(event) => setQuery(event.target.value)} /></span>
        <Button label={`Réinscrire ${selected.length} élève(s)`} icon="pi pi-refresh" disabled={!allowed || !yearId || !selected.length} loading={loading} size="small" onClick={() => {
          setLoading(true);
          setResults([]);
          void batchReenrollStudents(selected.map((item) => item.enrollmentId), yearId)
            .then((items) => {
              setResults(items);
              const successCount = items.filter((item) => item.status === "created").length;
              notify({ severity: successCount === items.length ? "success" : "warn", summary: `${successCount}/${items.length} réinscriptions créées` });
              setStudents((current) => current.filter((student) => !items.some((result) => result.student_id === student.id && result.status === "created")));
              setSelected([]);
            })
            .catch(() => notify({ severity: "error", summary: "Traitement impossible" }))
            .finally(() => setLoading(false));
        }} />
      </div>
      <Message severity="info" text={`Les dossiers seront créés dans l’année active avec le statut « ${resultStatus} ». L’inscription de l’année antérieure reste inchangée.`} />
      {results.length > 0 ? <Message severity={created === results.length ? "success" : "warn"} text={`${created} dossier(s) créé(s), ${results.length - created} à corriger.`} /> : null}
      <DataTable value={filteredStudents} dataKey="id" selectionMode="multiple" selection={selected} onSelectionChange={(event) => setSelected(event.value)} paginator rows={15} size="small" emptyMessage="Tous les élèves de cette année sont déjà réinscrits ou aucun élève confirmé n’a été trouvé.">
        <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
        <Column field="matricule" header="Matricule" />
        <Column header="Élève" body={(item: StudentListItem) => `${item.firstName} ${item.lastName}`} />
        <Column field="cycleName" header="Ancien cycle" />
        <Column field="levelName" header="Ancien niveau" />
        <Column header="Résultat" body={(item: StudentListItem) => { const result = results.find((entry) => entry.student_id === item.id); return !result ? "—" : result.status === "created" ? `Créé · ${result.target_level}` : result.reason; }} />
      </DataTable>
    </section>
  );
}
