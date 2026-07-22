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
import {
  listEnrollmentWorkflows,
  listAttendance,
  createAttendance,
  createAttendanceBatch,
  updateAttendanceJustification,
  type EnrollmentWorkflowRow,
  type AttendanceRow,
} from "../services/schooling-workflows.service";

export function AttendanceWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWorkflowRow[]>([]);
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
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    if (!institutionId || !yearId) return;
    setLoading(true);
    setFailure("");
    try {
      const [attendance, workflowRows] = await Promise.all([
        listAttendance(institutionId, yearId),
        listEnrollmentWorkflows(institutionId, yearId),
      ]);
      setItems(attendance);
      setEnrollments(workflowRows.filter((item) => item.status === "confirmed"));
    } catch {
      setFailure("Impossible de charger l'assiduité.");
    } finally {
      setLoading(false);
    }
  }, [institutionId, yearId]);

  useEffect(() => void load(), [load]);

  const options = useMemo(() => enrollments.map((item) => ({
    label: `${item.student.first_name} ${item.student.last_name} · ${item.student.matricule}`,
    value: item.id,
  })), [enrollments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const student = item.enrollment.student;
      const haystack = `${student.first_name} ${student.last_name} ${student.matricule}`.toLocaleLowerCase("fr");
      return (!query || haystack.includes(query)) && (!status || item.justification_status === status);
    });
  }, [items, search, status]);

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
      setDialog(null);
      resetForm();
      await load();
    } catch {
      setFailure("L'absence ou le retard n'a pas pu être enregistré.");
    }
  };

  const saveGroup = async () => {
    if (!institutionId || !yearId || !selectedIds.length || !date) return;
    try {
      await createAttendanceBatch({ institutionId, academicYearId: yearId, enrollmentIds: selectedIds, date, slot, kind, reason });
      setDialog(null);
      resetForm();
      await load();
    } catch {
      setFailure("La saisie groupée n'a pas pu être enregistrée.");
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <SchoolingPanel
    path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
    title="Assiduité"
    description="Saisissez rapidement les absences et retards, individuellement ou en groupe, puis traitez les justificatifs."
    alert={failure ? <Message severity="error" text={failure} /> : undefined}
  >
    <div className="mb-3 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
      <span className="p-input-icon-left min-w-56 flex-1"><i className="pi pi-search" /><InputText className="w-full" value={search} placeholder="Rechercher un élève" onChange={(event) => setSearch(event.target.value)} /></span>
      <InputText className="w-40 shrink-0" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <Dropdown className="w-44 shrink-0" value={status} showClear placeholder="Tous les statuts" options={[{label:"Non justifié",value:"unjustified"},{label:"En attente",value:"pending"},{label:"Justifié",value:"justified"}]} onChange={(event) => setStatus(event.value ?? "")} />
      <Button className="shrink-0" label="Ajouter" icon="pi pi-plus" onClick={() => setDialog("single")} />
      <Button className="shrink-0" label="Ajouter en groupe" icon="pi pi-users" outlined onClick={() => setDialog("group")} />
    </div>

    <DataTable value={filtered} loading={loading} paginator rows={20} dataKey="id" size="small" emptyMessage="Aucune absence ni retard enregistré.">
      <Column field="attendance_date" header="Date" />
      <Column header="Élève" body={(row: AttendanceRow) => <div><strong>{row.enrollment.student.first_name} {row.enrollment.student.last_name}</strong><small className="block text-slate-500">{row.enrollment.student.matricule}</small></div>} />
      <Column header="Type" body={(row: AttendanceRow) => <Tag value={row.kind === "absence" ? "Absence" : "Retard"} severity={row.kind === "absence" ? "danger" : "warning"} />} />
      <Column field="slot_label" header="Créneau" body={(row: AttendanceRow) => row.slot_label || "—"} />
      <Column header="Justification" body={(row: AttendanceRow) => <Dropdown className="w-36" value={row.justification_status} options={[{label:"Non justifié",value:"unjustified"},{label:"En attente",value:"pending"},{label:"Justifié",value:"justified"}]} onChange={(event) => void updateAttendanceJustification(row.id, event.value, row.reason ?? undefined).then(load)} />} />
      <Column field="reason" header="Motif" body={(row: AttendanceRow) => row.reason || "—"} />
    </DataTable>

    <Dialog header="Enregistrer une absence ou un retard" visible={dialog === "single"} onHide={() => setDialog(null)} style={{ width: "min(560px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" text onClick={() => setDialog(null)} /><Button label="Enregistrer" disabled={!enrollmentId || !date} onClick={() => void saveSingle()} /></div>}>
      <div className="grid gap-4">
        <label><span className="mb-1 block text-sm font-semibold">Élève</span><Dropdown className="w-full" filter value={enrollmentId} options={options} placeholder="Choisir un élève confirmé" onChange={(event) => setEnrollmentId(String(event.value))} /></label>
        <AttendanceFields date={date} setDate={setDate} kind={kind} setKind={setKind} slot={slot} setSlot={setSlot} reason={reason} setReason={setReason} />
      </div>
    </Dialog>

    <Dialog header="Ajouter l'assiduité en groupe" visible={dialog === "group"} onHide={() => setDialog(null)} style={{ width: "min(760px, 96vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" text onClick={() => setDialog(null)} /><Button label={`Enregistrer (${selectedIds.length})`} disabled={!selectedIds.length || !date} onClick={() => void saveGroup()} /></div>}>
      <div className="grid gap-4">
        <AttendanceFields date={date} setDate={setDate} kind={kind} setKind={setKind} slot={slot} setSlot={setSlot} reason={reason} setReason={setReason} />
        <div>
          <div className="mb-2 flex items-center justify-between"><strong className="text-sm">Élèves concernés</strong><Button label="Tout sélectionner" text size="small" onClick={() => setSelectedIds(enrollments.map((item) => item.id))} /></div>
          <DataTable value={enrollments} dataKey="id" size="small" paginator rows={8} selection={enrollments.filter((item) => selectedIds.includes(item.id))} onSelectionChange={(event) => setSelectedIds((event.value as EnrollmentWorkflowRow[]).map((item) => item.id))}>
            <Column selectionMode="multiple" headerStyle={{ width: "3rem" }} />
            <Column header="Élève" body={(row: EnrollmentWorkflowRow) => `${row.student.first_name} ${row.student.last_name}`} />
            <Column header="Matricule" body={(row: EnrollmentWorkflowRow) => row.student.matricule} />
            <Column header="Niveau / classe" body={(row: EnrollmentWorkflowRow) => row.assignment[0]?.class_name || row.level_name_snapshot || "—"} />
          </DataTable>
        </div>
      </div>
    </Dialog>
  </SchoolingPanel>;
}

function AttendanceFields(props: {
  date: string;
  setDate: (value: string) => void;
  kind: "absence" | "late";
  setKind: (value: "absence" | "late") => void;
  slot: string;
  setSlot: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
}) {
  return <>
    <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Date</span><InputText className="w-full" type="date" value={props.date} onChange={(event) => props.setDate(event.target.value)} /></label><label><span className="mb-1 block text-sm font-semibold">Type</span><Dropdown className="w-full" value={props.kind} options={[{label:"Absence",value:"absence"},{label:"Retard",value:"late"}]} onChange={(event) => props.setKind(event.value)} /></label></div>
    <label><span className="mb-1 block text-sm font-semibold">Créneau</span><InputText className="w-full" value={props.slot} placeholder="Ex. Matin, 08h-10h" onChange={(event) => props.setSlot(event.target.value)} /></label>
    <label><span className="mb-1 block text-sm font-semibold">Motif ou observation</span><InputTextarea className="w-full" rows={2} value={props.reason} onChange={(event) => props.setReason(event.target.value)} /></label>
  </>;
}
