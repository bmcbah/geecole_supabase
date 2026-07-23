import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { AdvancedFilterPanel } from "../../../shared/components/workspace/AdvancedFilterPanel";
import { SmartFilterBar } from "../../../shared/components/workspace/SmartFilterBar";
import { Workspace } from "../../../shared/components/workspace/Workspace";
import { WorkspaceDataTable } from "../../../shared/components/workspace/WorkspaceDataTable";
import { WorkspaceHeader } from "../../../shared/components/workspace/WorkspaceHeader";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { listStudents } from "../services/schooling.service";
import type { StudentListItem } from "../types/schooling";

const controlClass = "h-10 w-full min-w-0";

export function StudentsPage() {
  const navigate = useNavigate();
  const { institutionId, yearId, year } = useAcademicSession();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState("");
  const [query, setQuery] = useState("");
  const [cycle, setCycle] = useState("");
  const [level, setLevel] = useState("");
  const [className, setClassName] = useState("");
  const [gender, setGender] = useState("");
  const [contact, setContact] = useState("");
  const [guardian, setGuardian] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      setStudents(await listStudents(institutionId, yearId));
    } catch {
      setFailure("Impossible de charger les élèves inscrits de cette année scolaire.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const optionList = (values: string[], allLabel: string) => [
    { label: allLabel, value: "" },
    ...Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")).map((value) => ({ label: value, value })),
  ];

  const cycleOptions = useMemo(() => optionList(students.map((item) => item.cycleName), "Tous les cycles"), [students]);
  const levelOptions = useMemo(() => optionList(students.map((item) => item.levelName), "Tous les niveaux"), [students]);
  const classOptions = useMemo(() => optionList(students.map((item) => item.className), "Toutes les classes"), [students]);
  const guardianOptions = useMemo(() => optionList(students.map((item) => item.guardianName), "Tous les responsables"), [students]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return students.filter((student) => {
      const searchable = `${student.firstName} ${student.lastName} ${student.matricule} ${student.guardianName} ${student.guardianPhone}`.toLocaleLowerCase("fr");
      return (!normalized || searchable.includes(normalized)) && (!cycle || student.cycleName === cycle) && (!level || student.levelName === level) && (!className || student.className === className) && (!gender || student.gender === gender) && (!guardian || student.guardianName === guardian) && (!contact || (contact === "present" ? Boolean(student.guardianPhone) : !student.guardianPhone));
    });
  }, [students, query, cycle, level, className, gender, guardian, contact]);

  const groups = useMemo(() => {
    const result = new Map<string, { key: string; name: string; phone: string; students: StudentListItem[] }>();
    filtered.forEach((student) => {
      const key = student.guardianId ?? `missing-${student.id}`;
      const current = result.get(key) ?? { key, name: student.guardianName || "Responsable non renseigné", phone: student.guardianPhone, students: [] };
      current.students.push(student);
      result.set(key, current);
    });
    return Array.from(result.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [filtered]);

  const activeFilterCount = [cycle, level, className, gender, contact, guardian].filter(Boolean).length;
  const resetFilters = () => { setCycle(""); setLevel(""); setClassName(""); setGender(""); setContact(""); setGuardian(""); };
  const toggleGroup = (key: string) => setExpandedGroups((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire avant de consulter les élèves." />;

  const studentIdentity = (item: StudentListItem) => (
    <button type="button" className="flex min-w-0 items-center gap-3 border-0 bg-transparent p-0 text-left" onClick={() => navigate(`/scolarite/eleves/${item.id}`)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{item.firstName[0]}{item.lastName[0]}</span>
      <span className="min-w-0"><strong className="block truncate text-sm text-slate-950">{item.firstName} {item.lastName}</strong><small className="block truncate text-xs text-slate-500">{item.matricule}</small></span>
    </button>
  );

  return (
    <Workspace
      header={<WorkspaceHeader title="Élèves" description={`Élèves ayant une inscription confirmée${year?.name ? ` pour ${year.name}` : ""}.`} meta={<span className="text-sm font-medium text-slate-500">{filtered.length} élève{filtered.length > 1 ? "s" : ""}</span>} actions={<Button label="Gérer les inscriptions" icon="pi pi-user-plus" onClick={() => navigate("/scolarite/inscriptions")} />} />}
      feedback={failure ? <Message severity="error" text={failure} /> : undefined}
    >
      <SmartFilterBar
        search={<span className="p-input-icon-left block w-full"><i className="pi pi-search" /><InputText className="h-10 w-full pl-10" value={query} placeholder="Nom, matricule, responsable ou téléphone" onChange={(event) => setQuery(event.target.value)} /></span>}
        quickFilters={<><Dropdown className="w-44" value={cycle} options={cycleOptions} onChange={(event) => setCycle(String(event.value))} /><Dropdown className="w-44" value={level} options={levelOptions} onChange={(event) => setLevel(String(event.value))} /><Dropdown className="w-44" value={className} options={classOptions} onChange={(event) => setClassName(String(event.value))} /></>}
        actions={<><label className="hidden items-center gap-2 text-sm text-slate-600 md:flex"><InputSwitch checked={grouped} onChange={(event) => setGrouped(Boolean(event.value))} /><span>Grouper par responsable</span></label><Button label="Plus de filtres" icon="pi pi-sliders-h" severity="secondary" outlined badge={activeFilterCount ? String(activeFilterCount) : undefined} onClick={() => setAdvanced((value) => !value)} /></>}
      />

      {advanced ? <AdvancedFilterPanel footer={activeFilterCount ? <Button label="Réinitialiser" icon="pi pi-filter-slash" severity="secondary" text onClick={resetFilters} /> : undefined}>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Cycle</span><Dropdown className={controlClass} value={cycle} options={cycleOptions} onChange={(event) => setCycle(String(event.value))} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Niveau</span><Dropdown className={controlClass} value={level} options={levelOptions} onChange={(event) => setLevel(String(event.value))} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Classe</span><Dropdown className={controlClass} value={className} options={classOptions} onChange={(event) => setClassName(String(event.value))} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Sexe</span><Dropdown className={controlClass} value={gender} options={[{ label: "Tous", value: "" }, { label: "Féminin", value: "female" }, { label: "Masculin", value: "male" }]} onChange={(event) => setGender(String(event.value))} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Responsable principal</span><Dropdown className={controlClass} value={guardian} options={guardianOptions} filter onChange={(event) => setGuardian(String(event.value))} /></label>
        <label><span className="mb-1 block text-xs font-semibold text-slate-600">Contact responsable</span><Dropdown className={controlClass} value={contact} options={[{ label: "Tous", value: "" }, { label: "Avec téléphone", value: "present" }, { label: "Sans téléphone", value: "missing" }]} onChange={(event) => setContact(String(event.value))} /></label>
      </AdvancedFilterPanel> : null}

      <div className="pt-4">
        {loading ? <div className="grid min-h-80 place-items-center"><ProgressSpinner className="size-10" /></div> : !filtered.length ? <div className="grid min-h-80 place-items-center border border-dashed border-slate-300 text-sm text-slate-500">Aucun élève inscrit ne correspond aux filtres.</div> : grouped ? (
          <div className="space-y-2">
            <div className="flex justify-end gap-2"><Button label="Tout déplier" severity="secondary" text onClick={() => setExpandedGroups(new Set(groups.map((group) => group.key)))} /><Button label="Tout replier" severity="secondary" text onClick={() => setExpandedGroups(new Set())} /></div>
            {groups.map((group) => <section key={group.key} className="border border-slate-200 bg-white"><button type="button" className="flex w-full items-center gap-3 border-0 bg-white px-4 py-3 text-left hover:bg-slate-50" onClick={() => toggleGroup(group.key)}><i className={`pi ${expandedGroups.has(group.key) ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-slate-400`} /><span className="min-w-0 flex-1"><strong className="block text-sm text-slate-950">{group.name}</strong><small className="text-xs text-slate-500">{group.phone || "Téléphone non renseigné"}</small></span><span className="text-sm font-semibold text-slate-700">{group.students.length} élève{group.students.length > 1 ? "s" : ""}</span></button>{expandedGroups.has(group.key) ? <div className="divide-y divide-slate-100 border-t border-slate-200">{group.students.map((student) => <div key={student.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_160px_160px_auto]">{studentIdentity(student)}<span className="text-sm text-slate-600">{student.levelName || "—"}</span><span className="text-sm text-slate-600">{student.className || "Sans classe"}</span><Button icon="pi pi-arrow-right" text rounded aria-label={`Ouvrir ${student.firstName} ${student.lastName}`} onClick={() => navigate(`/scolarite/eleves/${student.id}`)} /></div>)}</div> : null}</section>)}
          </div>
        ) : (
          <WorkspaceDataTable value={filtered} dataKey="id" emptyMessage="Aucun élève ne correspond à cette recherche.">
            <Column header="Élève" sortable sortField="lastName" body={studentIdentity} />
            <Column field="cycleName" header="Cycle" sortable />
            <Column field="levelName" header="Niveau" sortable />
            <Column field="className" header="Classe" sortable body={(item: StudentListItem) => item.className || <span className="text-amber-700">Sans classe</span>} />
            <Column header="Responsable" body={(item: StudentListItem) => <span><strong className="block text-sm font-medium text-slate-800">{item.guardianName}</strong><small className="text-xs text-slate-500">{item.guardianPhone || "Téléphone manquant"}</small></span>} />
            <Column header="" bodyClassName="w-14" body={(item: StudentListItem) => <Button icon="pi pi-arrow-right" text rounded aria-label={`Ouvrir ${item.firstName} ${item.lastName}`} onClick={() => navigate(`/scolarite/eleves/${item.id}`)} />} />
          </WorkspaceDataTable>
        )}
      </div>
    </Workspace>
  );
}
