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
import { Toolbar } from "primereact/toolbar";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { useToast } from "../../../shared/components/toast-context";
import { deleteTeacherProfile, listTeacherCandidates, listTeacherProfiles, saveTeacherProfile, type TeacherEmploymentStatus, type TeacherProfileRow } from "../services/teachers.service";

const statusOptions = [
  { label: "Permanent", value: "permanent" },
  { label: "Contractuel", value: "contract" },
  { label: "Vacataire", value: "vacation" },
  { label: "Stagiaire", value: "intern" },
  { label: "Inactif", value: "inactive" },
];

export function TeachersPage() {
  const { institutionId, year } = useAcademicSession();
  const notify = useToast();
  const [items, setItems] = useState<TeacherProfileRow[]>([]);
  const [candidates, setCandidates] = useState<Array<{ label: string; value: string }>>([]);
  const [editing, setEditing] = useState<TeacherProfileRow | null | undefined>(undefined);
  const [teacherUserId, setTeacherUserId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<TeacherEmploymentStatus>("permanent");
  const [hiredOn, setHiredOn] = useState("");
  const [leftOn, setLeftOn] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!year) return;
    const [profiles, people] = await Promise.all([listTeacherProfiles(institutionId, year.id), listTeacherCandidates(institutionId)]);
    setItems(profiles);
    setCandidates(people.map((person) => ({ label: `${person.first_name} ${person.last_name}`, value: person.auth_user_id! })));
  }, [institutionId, year]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (editing === undefined) return;
    setTeacherUserId(editing?.teacher_user_id ?? "");
    setEmployeeNumber(editing?.employee_number ?? "");
    setSpecialty(editing?.specialty ?? "");
    setEmploymentStatus(editing?.employment_status ?? "permanent");
    setHiredOn(editing?.hired_on ?? "");
    setLeftOn(editing?.left_on ?? "");
    setNotes(editing?.notes ?? "");
  }, [editing]);

  const availableCandidates = useMemo(() => candidates.filter((candidate) => editing?.teacher_user_id === candidate.value || !items.some((item) => item.teacher_user_id === candidate.value)), [candidates, editing, items]);

  const submit = async () => {
    if (!year || !teacherUserId) return;
    setSaving(true);
    try {
      await saveTeacherProfile(institutionId, year.id, {
        teacher_user_id: teacherUserId,
        employee_number: employeeNumber || null,
        specialty: specialty || null,
        employment_status: employmentStatus,
        hired_on: hiredOn || null,
        left_on: leftOn || null,
        notes: notes || null,
        is_active: employmentStatus !== "inactive",
      }, editing?.id);
      setEditing(undefined);
      await load();
      notify({ severity: "success", summary: "Profil enseignant enregistré" });
    } catch (error) {
      notify({ severity: "error", summary: "Enregistrement impossible", detail: error instanceof Error ? error.message : "Erreur inconnue" });
    } finally { setSaving(false); }
  };

  if (!year) return <Message severity="warn" text="Sélectionnez une année scolaire." />;

  return <div className="space-y-4">
    <PageHeader title="Enseignants" description="Créez les profils professionnels annuels avant de réaliser les affectations pédagogiques." meta={<Tag value={year.name} severity="info" />} />
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Toolbar className="rounded-none border-0 border-b border-slate-200" start={<strong>{items.length} enseignant(s)</strong>} end={<Button label="Ajouter un enseignant" icon="pi pi-plus" onClick={() => setEditing(null)} />} />
      <DataTable value={items} dataKey="id" size="small" stripedRows emptyMessage="Aucun profil enseignant pour cette année">
        <Column header="Enseignant" body={(row: TeacherProfileRow) => <div><div className="font-medium">{row.first_name} {row.last_name}</div><small>{row.email ?? row.phone ?? "Compte lié"}</small></div>} />
        <Column field="employee_number" header="Matricule" />
        <Column field="specialty" header="Spécialité" />
        <Column header="Statut" body={(row: TeacherProfileRow) => <Tag value={statusOptions.find((item) => item.value === row.employment_status)?.label ?? row.employment_status} severity={row.is_active ? "success" : "secondary"} />} />
        <Column header="Actions" bodyClassName="text-right" body={(row: TeacherProfileRow) => <div className="flex justify-end gap-1"><Button icon="pi pi-pencil" text onClick={() => setEditing(row)} /><Button icon="pi pi-trash" text severity="danger" onClick={() => void deleteTeacherProfile(row.id).then(load)} /></div>} />
      </DataTable>
    </section>
    <Dialog header={editing?.id ? "Modifier l’enseignant" : "Ajouter un enseignant"} visible={editing !== undefined} modal className="form-dialog form-dialog-wide" onHide={() => setEditing(undefined)}>
      <div className="form-grid">
        <div className="field field-wide"><label htmlFor="teacher-person">Personne disposant du rôle enseignant</label><Dropdown inputId="teacher-person" value={teacherUserId} options={availableCandidates} filter disabled={Boolean(editing?.id)} onChange={(event) => setTeacherUserId(event.value)} /></div>
        <div className="field"><label htmlFor="teacher-number">Matricule employé</label><InputText id="teacher-number" value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value.toUpperCase())} /></div>
        <div className="field"><label htmlFor="teacher-specialty">Spécialité</label><InputText id="teacher-specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} /></div>
        <div className="field"><label htmlFor="teacher-status">Statut</label><Dropdown inputId="teacher-status" value={employmentStatus} options={statusOptions} onChange={(event) => setEmploymentStatus(event.value)} /></div>
        <div className="field"><label htmlFor="teacher-hired">Prise de fonction</label><InputText id="teacher-hired" type="date" value={hiredOn} onChange={(event) => setHiredOn(event.target.value)} /></div>
        <div className="field"><label htmlFor="teacher-left">Fin de fonction</label><InputText id="teacher-left" type="date" value={leftOn} onChange={(event) => setLeftOn(event.target.value)} /></div>
        <div className="field field-wide"><label htmlFor="teacher-notes">Observations administratives</label><InputTextarea id="teacher-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
      </div>
      <div className="dialog-actions"><Button label="Annuler" severity="secondary" outlined onClick={() => setEditing(undefined)} /><Button label="Enregistrer" icon="pi pi-check" loading={saving} disabled={!teacherUserId} onClick={() => void submit()} /></div>
    </Dialog>
  </div>;
}
