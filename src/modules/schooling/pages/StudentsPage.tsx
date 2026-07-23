import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { SelectButton } from "primereact/selectbutton";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { MetricIcon } from "../../../shared/components/data-display/MetricIcon";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

const controlClass = "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm shadow-sm";

type GuardianGroup = {
  id: string;
  guardianName: string;
  guardianPhone: string;
  students: StudentListItem[];
};

export function StudentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [cycle, setCycle] = useState("");
  const [guardian, setGuardian] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<"students" | "guardians">("students");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setStudents(await listStudents(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les élèves de cette année scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const levelOptions = useMemo(() => [
    { label: "Tous les niveaux", value: "" },
    ...Array.from(new Set(students.map((item) => item.levelName).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ], [students]);

  const cycleOptions = useMemo(() => [
    { label: "Tous les cycles", value: "" },
    ...Array.from(new Set(students.map((item) => item.cycleName).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ], [students]);

  const guardianOptions = useMemo(() => [
    { label: "Tous les responsables", value: "" },
    ...Array.from(new Set(students.map((item) => item.guardianName).filter((value) => value && value !== "Non renseigné"))).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ], [students]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return students.filter((student) => {
      const searchable = `${student.firstName} ${student.lastName} ${student.matricule} ${student.guardianName} ${student.guardianPhone}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) &&
        (!status || student.status === status) &&
        (!level || student.levelName === level) &&
        (!cycle || student.cycleName === cycle) &&
        (!guardian || student.guardianName === guardian);
    });
  }, [students, query, status, level, cycle, guardian]);

  const guardianGroups = useMemo<GuardianGroup[]>(() => {
    const groups = new Map<string, GuardianGroup>();
    for (const student of filtered) {
      const key = `${student.guardianName || "Non renseigné"}|${student.guardianPhone || ""}`;
      const current = groups.get(key) ?? {
        id: key,
        guardianName: student.guardianName || "Non renseigné",
        guardianPhone: student.guardianPhone || "",
        students: [],
      };
      current.students.push(student);
      groups.set(key, current);
    }
    return [...groups.values()].sort((a, b) => a.guardianName.localeCompare(b.guardianName, "fr"));
  }, [filtered]);

  if (!yearId) return <Message severity="warn" text="Créez ou sélectionnez une année scolaire avant de gérer les élèves." />;

  const toolbar = (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_220px_220px]">
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Rechercher</span><span className="p-input-icon-left block w-full"><i className="pi pi-search" /><InputText className={`${controlClass} pl-9`} value={query} placeholder="Nom, matricule, responsable ou téléphone" onChange={(event) => setQuery(event.target.value)} /></span></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Statut</span><Dropdown className={controlClass} value={status} options={[{ label: "Tous les statuts", value: "" }, { label: "Préinscrits", value: "pre_registered" }, { label: "Inscrits", value: "confirmed" }, { label: "Transférés", value: "transferred" }]} onChange={(event) => setStatus(String(event.value))} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Niveau</span><Dropdown className={controlClass} value={level} options={levelOptions} onChange={(event) => setLevel(String(event.value))} /></label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button label={advanced ? "Masquer" : "Plus de filtres"} icon={advanced ? "pi pi-chevron-up" : "pi pi-sliders-h"} severity="secondary" outlined onClick={() => setAdvanced((value) => !value)} />
          </div>
        </div>
      </div>
      {advanced ? <div className="grid gap-3 border-t border-emerald-100 bg-emerald-50/35 p-4 md:grid-cols-3">
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Cycle</span><Dropdown className={controlClass} value={cycle} options={cycleOptions} onChange={(event) => setCycle(String(event.value))} /></label>
        <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Responsable principal</span><Dropdown className={controlClass} value={guardian} filter options={guardianOptions} onChange={(event) => setGuardian(String(event.value))} /></label>
        <div className="flex items-end"><Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={() => { setQuery(""); setStatus(""); setLevel(""); setCycle(""); setGuardian(""); }} /></div>
      </div> : null}
    </section>
  );

  return (
    <SchoolingPanel
      className="medium-controls"
      path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
      title="Élèves"
      description="Retrouvez les élèves inscrits ou préinscrits pour l’année de travail."
      meta={<div className="flex items-center gap-2 text-sm text-slate-500"><MetricIcon icon="pi-users" /><strong className="font-semibold text-slate-900">{filtered.length}</strong><span>élève{filtered.length > 1 ? "s" : ""}</span></div>}
      actions={<><Button label="Réinscriptions groupées" icon="pi pi-refresh" severity="secondary" outlined onClick={() => void navigate("/scolarite/reinscriptions")} /><Button label="Nouvelle inscription" icon="pi pi-user-plus" onClick={() => void navigate("/scolarite/inscriptions/nouvelle")} /></>}
      alert={failure ? <Message severity="error" text={failure} /> : undefined}
      toolbar={toolbar}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><strong className="block text-sm text-slate-900">Mode d’affichage</strong><small className="text-slate-500">Le regroupement utilise le responsable principal afin d’éviter les doublons.</small></div>
        <SelectButton value={viewMode} options={[{ label: "Liste élèves", value: "students", icon: "pi pi-list" }, { label: "Par parent", value: "guardians", icon: "pi pi-users" }]} optionLabel="label" optionValue="value" onChange={(event) => setViewMode(event.value as "students" | "guardians")} />
      </div>

      {loading ? <div className="grid min-h-[360px] place-items-center"><ProgressSpinner className="size-10" strokeWidth="4" /></div> : viewMode === "students" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <DataTable value={filtered} dataKey="id" paginator rows={10} rowsPerPageOptions={[10, 25, 50]} size="small" emptyMessage="Aucun élève ne correspond à cette recherche." onRowClick={(event) => void navigate(`/scolarite/eleves/${event.data.id}`)} rowClassName={() => "cursor-pointer hover:bg-emerald-50/40"}>
            <Column header="Élève" sortable sortField="lastName" body={(item: StudentListItem) => <div><strong className="block">{item.firstName} {item.lastName}</strong><small className="text-slate-500">{item.matricule}</small></div>} />
            <Column field="cycleName" header="Cycle" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column header="Responsable" body={(item: StudentListItem) => <div><span className="block">{item.guardianName}</span><small className="text-slate-500">{item.guardianPhone || "Téléphone manquant"}</small></div>} />
            <Column header="Statut" body={(item: StudentListItem) => <EnrollmentStatusTag status={item.status} />} />
          </DataTable>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <DataTable value={guardianGroups} dataKey="id" paginator rows={10} size="small" emptyMessage="Aucun regroupement disponible." expandableRowGroups rowGroupMode="subheader" groupRowsBy="guardianName" sortMode="single" sortField="guardianName" sortOrder={1} rowGroupHeaderTemplate={(group: GuardianGroup) => <div className="flex items-center justify-between gap-3"><span><strong>{group.guardianName}</strong><small className="ml-2 text-slate-500">{group.guardianPhone || "Téléphone manquant"}</small></span><span className="text-xs text-slate-500">{group.students.length} enfant(s)</span></div>}>
            <Column header="Enfants" body={(group: GuardianGroup) => <div className="space-y-2 py-1">{group.students.map((student) => <button key={student.id} type="button" className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-emerald-50" onClick={() => void navigate(`/scolarite/eleves/${student.id}`)}><span><strong className="block text-sm">{student.firstName} {student.lastName}</strong><small className="text-slate-500">{student.matricule} · {student.levelName}</small></span><EnrollmentStatusTag status={student.status} /></button>)}</div>} />
          </DataTable>
        </div>
      )}
    </SchoolingPanel>
  );
}
