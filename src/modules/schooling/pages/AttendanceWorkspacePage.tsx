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
import { listEnrollmentWorkflows, listAttendance, createAttendance, updateAttendanceJustification, type EnrollmentWorkflowRow, type AttendanceRow } from "../services/schooling-workflows.service";

export function AttendanceWorkspacePage() {
  const { institutionId, yearId, year } = useAcademicSession();
  const [items, setItems] = useState<AttendanceRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentWorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState("");
  const [kind, setKind] = useState<"absence" | "late">("absence");
  const [reason, setReason] = useState("");
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

  const save = async () => {
    if (!institutionId || !yearId || !enrollmentId || !date) return;
    try {
      await createAttendance({ institutionId, academicYearId: yearId, enrollmentId, date, slot, kind, reason });
      setDialog(false);
      setEnrollmentId("");
      setReason("");
      await load();
    } catch {
      setFailure("L'absence ou le retard n'a pas pu être enregistré.");
    }
  };

  if (!yearId) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <SchoolingPanel
    path={`Scolarité · ${year?.name ?? "Année scolaire"}`}
    title="Assiduité"
    description="Enregistrez les absences et retards, puis suivez leur justification."
    actions={<Button label="Nouvelle absence ou retard" icon="pi pi-plus" onClick={() => setDialog(true)} />}
    alert={failure ? <Message severity="error" text={failure} /> : undefined}
  >
    <DataTable value={items} loading={loading} paginator rows={20} dataKey="id" emptyMessage="Aucune absence ni retard enregistré.">
      <Column field="attendance_date" header="Date" />
      <Column header="Élève" body={(row: AttendanceRow) => <div><strong>{row.enrollment.student.first_name} {row.enrollment.student.last_name}</strong><small className="block text-slate-500">{row.enrollment.student.matricule}</small></div>} />
      <Column header="Type" body={(row: AttendanceRow) => <Tag value={row.kind === "absence" ? "Absence" : "Retard"} severity={row.kind === "absence" ? "danger" : "warning"} />} />
      <Column field="slot_label" header="Créneau" body={(row: AttendanceRow) => row.slot_label || "—"} />
      <Column header="Justification" body={(row: AttendanceRow) => <Dropdown value={row.justification_status} options={[{label:"Non justifié",value:"unjustified"},{label:"En attente",value:"pending"},{label:"Justifié",value:"justified"}]} onChange={(event) => void updateAttendanceJustification(row.id, event.value, row.reason ?? undefined).then(load)} />} />
      <Column field="reason" header="Motif" body={(row: AttendanceRow) => row.reason || "—"} />
    </DataTable>

    <Dialog header="Enregistrer une absence ou un retard" visible={dialog} onHide={() => setDialog(false)} style={{ width: "min(560px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" severity="secondary" text onClick={() => setDialog(false)} /><Button label="Enregistrer" disabled={!enrollmentId || !date} onClick={() => void save()} /></div>}>
      <div className="grid gap-4">
        <label><span className="mb-1 block text-sm font-semibold">Élève</span><Dropdown className="w-full" filter value={enrollmentId} options={options} placeholder="Choisir un élève confirmé" onChange={(event) => setEnrollmentId(String(event.value))} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-semibold">Date</span><InputText className="w-full" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span className="mb-1 block text-sm font-semibold">Type</span><Dropdown className="w-full" value={kind} options={[{label:"Absence",value:"absence"},{label:"Retard",value:"late"}]} onChange={(event) => setKind(event.value)} /></label></div>
        <label><span className="mb-1 block text-sm font-semibold">Créneau</span><InputText className="w-full" value={slot} placeholder="Ex. Matin, 08h-10h" onChange={(event) => setSlot(event.target.value)} /></label>
        <label><span className="mb-1 block text-sm font-semibold">Motif ou observation</span><InputTextarea className="w-full" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      </div>
    </Dialog>
  </SchoolingPanel>;
}
