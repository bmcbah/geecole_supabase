import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { createAttendance, listAttendance, updateAttendanceJustification, type AttendanceRow } from "../services/schooling-workflows.service";

export function StudentAttendancePanel({ institutionId, yearId, enrollmentId }: { institutionId: string; yearId: string; enrollmentId: string }) {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [visible, setVisible] = useState(false);
  const [kind, setKind] = useState<"absence" | "late">("absence");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await listAttendance(institutionId, yearId);
      setRows(data.filter((item) => item.enrollment.id === enrollmentId));
    } catch {
      setFailure("Impossible de charger l’assiduité de cet élève.");
    }
  }, [enrollmentId, institutionId, yearId]);

  useEffect(() => void load(), [load]);
  const unjustified = useMemo(() => rows.filter((item) => item.justification_status !== "justified").length, [rows]);

  const save = async () => {
    await createAttendance({ institutionId, academicYearId: yearId, enrollmentId, date, slot, kind, reason });
    setVisible(false);
    setReason("");
    setSlot("");
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold text-slate-950">Assiduité</h2><p className="text-sm text-slate-500">Absences, retards et justificatifs de l’année sélectionnée.</p></div>
        <div className="flex items-center gap-2"><Tag value={`${unjustified} à justifier`} severity={unjustified ? "warning" : "success"} /><Button label="Saisir" icon="pi pi-plus" size="small" onClick={() => setVisible(true)} /></div>
      </div>
      {failure ? <Message severity="error" text={failure} /> : null}
      <DataTable value={rows} dataKey="id" size="small" paginator={rows.length > 10} rows={10} emptyMessage="Aucune absence ou retard enregistré.">
        <Column field="attendance_date" header="Date" body={(row: AttendanceRow) => new Date(row.attendance_date).toLocaleDateString("fr-FR")} />
        <Column field="slot_label" header="Créneau" body={(row: AttendanceRow) => row.slot_label || "Journée"} />
        <Column header="Type" body={(row: AttendanceRow) => <Tag value={row.kind === "absence" ? "Absence" : "Retard"} severity={row.kind === "absence" ? "danger" : "warning"} />} />
        <Column field="reason" header="Motif" body={(row: AttendanceRow) => row.reason || "—"} />
        <Column header="Justification" body={(row: AttendanceRow) => <Dropdown value={row.justification_status} options={[{ label: "Non justifié", value: "unjustified" }, { label: "En attente", value: "pending" }, { label: "Justifié", value: "justified" }]} onChange={(event) => void updateAttendanceJustification(row.id, event.value, row.reason ?? undefined).then(load)} />} />
      </DataTable>
      <Dialog header="Ajouter une absence ou un retard" visible={visible} onHide={() => setVisible(false)} style={{ width: "min(560px, 95vw)" }} footer={<div className="flex justify-end gap-2"><Button label="Annuler" text severity="secondary" onClick={() => setVisible(false)} /><Button label="Enregistrer" disabled={!date} onClick={() => void save()} /></div>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold">Type</span><Dropdown className="w-full" value={kind} options={[{ label: "Absence", value: "absence" }, { label: "Retard", value: "late" }]} onChange={(event) => setKind(event.value)} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Date</span><InputText className="w-full" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span className="mb-1 block text-sm font-semibold">Créneau</span><InputText className="w-full" value={slot} onChange={(event) => setSlot(event.target.value)} placeholder="Matin, après-midi…" /></label>
          <label><span className="mb-1 block text-sm font-semibold">Motif</span><InputText className="w-full" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>
      </Dialog>
    </div>
  );
}
