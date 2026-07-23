import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { listAssignableEnrollments } from "../services/schooling-operations.service";
import {
  listAttendance,
  createAttendance,
  createAttendanceBatch,
  updateAttendanceJustification,
  type AttendanceRow,
} from "../services/schooling-workflows.service";

type EnrollmentRow = {
  id: string;
  level_name_snapshot: string;
  cycle_name_snapshot: string;
  student: { id: string; first_name: string; last_name: string; matricule: string };
  currentAssignment: { class_id: string; class_name_snapshot: string } | null;
};

const fieldClass = "w-full rounded-lg";

export function AttendanceWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<"single" | "group" | null>(null);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState("");
  const [kind, setKind] = useState<"absence" | "late">("absence");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupLevel, setGroupLevel] = useState("");
  const [groupClass, setGroupClass] = useState("");
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    const [attendanceResult, enrollmentResult] = await Promise.allSettled([
      listAttendance(institutionId, yearId),
      listAssignableEnrollments(institutionId, yearId),
    ]);
    if (attendanceResult.status === "fulfilled") setItems(attendanceResult.value);
    else setFailure("Impossible de charger les absences et retards.");
    if (enrollmentResult.status === "fulfilled") setEnrollments(enrollmentResult.value as EnrollmentRow[]);
    else setFailure((current) => current || "Impossible de charger la liste des élèves confirmés.");
    setLoading(false);
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const levelOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => item.level_name_snapshot).filter(Boolean))).sort().map((value) => ({ label: value, value })), [enrollments]);
  const classOptions = useMemo(() => Array.from(new Set(enrollments.map((item) => item.currentAssignment?.class_name_snapshot).filter((value): value is string => Boolean(value)))).sort().map((value) => ({ label: value, value })), [enrollments]);
  const studentOptions = useMemo(() => enrollments.map((item) => ({ label: `${item.student.first_name} ${item.student.last_name} · ${item.student.matricule}`, value: item.id })), [enrollments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const student = item.enrollment.student;
      const haystack = `${student.first_name} ${student.last_name} ${student.matricule}`.toLocaleLowerCase("fr");
      const enrollment = enrollments.find((row) => row.id === item.enrollment.id);
      return (!query || haystack.includes(query))
        && (!status || item.justification_status === status)
        && (!typeFilter || item.kind === typeFilter)
        && (!levelFilter || enrollment?.level_name_snapshot === levelFilter)
        && (!classFilter || enrollment?.currentAssignment?.class_name_snapshot === classFilter);
    });
  }, [classFilter, enrollments, items, levelFilter, search, status, typeFilter]);

  const groupRows = useMemo(() => {
    const query = groupSearch.trim().toLocaleLowerCase("fr");
    return enrollments.filter((item) => {
      const haystack = `${item.student.first_name} ${item.student.last_name} ${item.student.matricule}`.toLocaleLowerCase("fr");
      return (!query || haystack.includes(query))
        && (!groupLevel || item.level_name_snapshot === groupLevel)
        && (!groupClass || item.currentAssignment?.class_name_snapshot === groupClass);
    });
  }, [enrollments, groupClass, groupLevel, groupSearch]);

  const resetForm = () => {
    setEnrollmentId("");
    setSelectedIds([]);
    setReason("");
    setSlot("");
  };

  const saveSingle = async () => {
    if (!institutionId || !yearId || !enrollmentId || !date) return;
    try {
      await createAttendance({ institutionId, academicYearId: yearId, enrollmentId, date, slot, kind, reason });
      setDialog(null); resetForm(); await load();
    } catch { setFailure("L'absence ou le retard n'a pas pu être enregistré."); }
  };

  const saveGroup = async () => {
    if (!institutionId || !yearId || !selectedIds.length || !date) return;
    try {
      await createAttendanceBatch({ institutionId, academicYearId: yearId, enrollmentIds: selectedIds, date, slot, kind, reason });
      setDialog(null); resetForm(); await load();
    } catch { setFailure("La saisie groupée n'a pas pu être enregistrée."); }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <SchoolingPanel
    path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
    title="Assiduité"
    description="Saisissez les absences et retards, filtrez la liste et traitez les justificatifs."
    alert={failure ? <Message severity="error" text={failure} /> : undefined}
    toolbar={<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <span className="p-input-icon-left xl:col-span-2"><i className="pi pi-search" /><InputText className={fieldClass} value={search} placeholder="Nom ou matricule" onChange={(event) => setSearch(event.target.value)} /></span>
      <Dropdown className={fieldClass} value={levelFilter} showClear placeholder="Tous les niveaux" options={levelOptions} onChange={(event) => setLevelFilter(event.value ?? "")} />
      <Dropdown className={fieldClass} value={classFilter} showClear placeholder="Toutes les classes" options={classOptions} onChange={(event) => setClassFilter(event.value ?? "")} />
      <Dropdown className={fieldClass} value={typeFilter} showClear placeholder="Tous les types" options={[{label:"Absence",value:"absence"},{label:"Retard",value:"late"}]} onChange={(event) => setTypeFilter(event.value ?? "")} />
      <Dropdown className={fieldClass} value={status} showClear placeholder="Tous les statuts" options={[{label:"Non justifié",value:"unjustified"},{label:"En attente",value:"pending"},{label:"Justifié",value:"justified"}]} onChange={(event) => setStatus(event.value ?? "")} />
      <div className="flex gap-2 md:col-span-2 xl:col-span-6 xl:justify-end"><Button label="Ajouter" icon="pi pi-plus" onClick={() => setDialog("single")} /><Button label="Ajouter en groupe" icon="pi pi-users" outlined onClick={() => setDialog("group")} /></div>
    </div>}
  >
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <DataTable value={filtered} loading={loading} paginator rows={20} dataKey="id" size="small" emptyMessage="Aucune absence ni retard enregistré." tableStyle={{ minWidth: "960px" }}>
        <Column field="attendance_date" header="Date" />
        <Column header="Élève" body={(row: AttendanceRow) => <div><strong>{row.enrollment.student.first_name} {row.enrollment.student.last_name}</strong><small className="block text-slate-500">{row.enrollment.student.matricule}</small></div>} />
        <Column header="Type" body={(row: AttendanceRow) => <Tag value={row.kind === "absence" ? "Absence" : "Retard"} severity={row.kind === "absence" ? "danger" : "warning"} />} />
        <Column field="slot_label" header="Créneau" body={(row: AttendanceRow) => row.slot_label || "—"} />
        <Column header="Justification" body={(row: AttendanceRow) => <Dropdown className="w-40 rounded-lg" value={row.justification_status} options={[{label:"Non justifié",value:"unjustified"},{label:"En attente",value:"pending"},{label:"Justifié",value:"justified"}]} onChange={(event) => void updateAttendanceJustification(row.id, event.value, row.reason ?? undefined).then(load)} />} />
        <Column field="reason" header="Motif" body={(row: AttendanceRow) => row.reason || "—"} />
      </DataTable>
    </div>

    <Dialog header="Enregistrer une absence ou un retard" visible={dialog === "single"} onHide={() => setDialog(null)} style={{ width: "min(640px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setDialog(null)} /><Button label="Enregistrer" disabled={!enrollmentId || !date} onClick={() => void saveSingle()} /></div>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium">Élève</span><Dropdown className={fieldClass} filter value={enrollmentId} options={studentOptions} placeholder="Choisir un élève confirmé" onChange={(event) => setEnrollmentId(String(event.value))} /></label>
        <AttendanceFields date={date} setDate={setDate} kind={kind} setKind={setKind} slot={slot} setSlot={setSlot} reason={reason} setReason={setReason} />
      </div>
    </Dialog>

    <Dialog header="Ajouter l'assiduité en groupe" visible={dialog === "group"} onHide={() => setDialog(null)} style={{ width: "min(980px, 96vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" outlined onClick={() => setDialog(null)} /><Button label={`Enregistrer (${selectedIds.length})`} disabled={!selectedIds.length || !date} onClick={() => void saveGroup()} /></div>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><AttendanceFields date={date} setDate={setDate} kind={kind} setKind={setKind} slot={slot} setSlot={setSlot} reason={reason} setReason={setReason} /></div>
        <div className="grid gap-3 md:grid-cols-3">
          <span className="p-input-icon-left"><i className="pi pi-search" /><InputText className={fieldClass} value={groupSearch} placeholder="Rechercher un élève" onChange={(event) => setGroupSearch(event.target.value)} /></span>
          <Dropdown className={fieldClass} value={groupLevel} showClear placeholder="Tous les niveaux" options={levelOptions} onChange={(event) => setGroupLevel(event.value ?? "")} />
          <Dropdown className={fieldClass} value={groupClass} showClear placeholder="Toutes les classes" options={classOptions} onChange={(event) => setGroupClass(event.value ?? "")} />
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><strong className="text-sm">Élèves concernés</strong><Button label="Sélectionner la liste filtrée" text size="small" onClick={() => setSelectedIds(groupRows.map((item) => item.id))} /></div>
          <DataTable value={groupRows} dataKey="id" size="small" scrollable scrollHeight="360px" selection={groupRows.filter((item) => selectedIds.includes(item.id))} onSelectionChange={(event) => setSelectedIds((event.value as EnrollmentRow[]).map((item) => item.id))}>
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column header="Élève" body={(row: EnrollmentRow) => `${row.student.first_name} ${row.student.last_name}`} />
            <Column header="Matricule" body={(row: EnrollmentRow) => row.student.matricule} />
            <Column field="level_name_snapshot" header="Niveau" />
            <Column header="Classe" body={(row: EnrollmentRow) => row.currentAssignment?.class_name_snapshot || "Non affectée"} />
          </DataTable>
        </div>
      </div>
    </Dialog>
  </SchoolingPanel>;
}

function AttendanceFields(props: { date: string; setDate: (value: string) => void; kind: "absence" | "late"; setKind: (value: "absence" | "late") => void; slot: string; setSlot: (value: string) => void; reason: string; setReason: (value: string) => void; }) {
  return <>
    <label><span className="mb-1.5 block text-sm font-medium">Date</span><InputText className={fieldClass} type="date" value={props.date} onChange={(event) => props.setDate(event.target.value)} /></label>
    <label><span className="mb-1.5 block text-sm font-medium">Type</span><Dropdown className={fieldClass} value={props.kind} options={[{label:"Absence",value:"absence"},{label:"Retard",value:"late"}]} onChange={(event) => props.setKind(event.value)} /></label>
    <label><span className="mb-1.5 block text-sm font-medium">Créneau</span><InputText className={fieldClass} value={props.slot} placeholder="Ex. Matin, 08h-10h" onChange={(event) => props.setSlot(event.target.value)} /></label>
    <label><span className="mb-1.5 block text-sm font-medium">Motif ou observation</span><InputTextarea className={fieldClass} rows={2} value={props.reason} onChange={(event) => props.setReason(event.target.value)} /></label>
  </>;
}