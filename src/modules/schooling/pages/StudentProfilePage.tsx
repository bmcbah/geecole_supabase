import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { StudentFinancePanel } from "../../financial-management/components/StudentFinancePanel";
import { StudentResultsPanel } from "../../notes/components/StudentResultsPanel";
import { AddGuardianDialog } from "../components/AddGuardianDialog";
import { GuardianManagementPanel } from "../components/GuardianManagementPanel";
import { StudentAttendancePanel } from "../components/StudentAttendancePanel";
import { StudentAvatarUpload } from "../components/StudentAvatarUpload";
import { StudentClassAssignment } from "../components/StudentClassAssignment";
import { StudentDocumentsPanel } from "../components/StudentDocumentsPanel";
import { StudentProfileActions } from "../components/StudentProfileActions";
import { getStudent } from "../services/schooling.service";
import { changeStudentStatus } from "../services/student-status.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;
type ProfileTab = "overview" | "guardians" | "schooling" | "attendance" | "results" | "documents" | "finances";

const tabs: Array<{ id: ProfileTab; label: string; icon: string }> = [
  { id: "overview", label: "Vue d’ensemble", icon: "pi-home" },
  { id: "guardians", label: "Responsables", icon: "pi-users" },
  { id: "schooling", label: "Parcours scolaire", icon: "pi-book" },
  { id: "attendance", label: "Assiduité", icon: "pi-calendar" },
  { id: "results", label: "Notes et bulletins", icon: "pi-chart-bar" },
  { id: "documents", label: "Documents", icon: "pi-folder" },
  { id: "finances", label: "Situation financière", icon: "pi-wallet" },
];

const enrollmentLabels: Record<string, string> = {
  draft: "Brouillon",
  pre_registered: "Préinscription",
  confirmed: "Inscription confirmée",
  rejected: "Refusée",
  cancelled: "Annulée",
  transferred: "Transférée",
  withdrawn: "Retirée",
};

const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value)) : "Non renseignée";

export function StudentProfilePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId, year, institutionId } = useAcademicSession();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [failure, setFailure] = useState("");
  const [guardianDialog, setGuardianDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [changingStatus, setChangingStatus] = useState(false);

  const reload = async () => {
    if (!studentId || !yearId) return;
    setDetail(await getStudent(studentId, yearId));
  };

  useEffect(() => {
    if (!studentId || !yearId) return;
    setFailure("");
    setDetail(null);
    void getStudent(studentId, yearId).then(setDetail).catch(() => setFailure("Impossible de charger la fiche élève."));
  }, [studentId, yearId]);

  const age = useMemo(() => {
    if (!detail?.student.birth_date) return null;
    const birth = new Date(detail.student.birth_date);
    const now = new Date();
    return now.getFullYear() - birth.getFullYear() - (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  }, [detail?.student.birth_date]);

  if (failure) return <Message severity="error" text={failure} />;
  if (!detail) return <div className="grid min-h-[55vh] place-items-center text-sm text-slate-500">Chargement du dossier élève…</div>;

  const { student, enrollment, guardians } = detail;
  const fullName = `${student.first_name} ${student.last_name}`;
  const active = student.status === "active";

  const toggleStudentStatus = async () => {
    setChangingStatus(true);
    try {
      await changeStudentStatus(student.id, active ? "inactive" : "active");
      await reload();
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button label="Retour aux élèves" icon="pi pi-arrow-left" text severity="secondary" onClick={() => void navigate("/scolarite/eleves")} />
        <div className="flex flex-wrap items-center gap-2">
          <Button label={active ? "Désactiver l’élève" : "Activer l’élève"} icon={active ? "pi pi-pause" : "pi pi-check"} severity={active ? "warning" : "success"} outlined loading={changingStatus} onClick={() => void toggleStudentStatus()} />
          {enrollment?.status === "confirmed" ? <Button label="Réinscrire" icon="pi pi-refresh" outlined onClick={() => void navigate(`/scolarite/eleves/${studentId}/reinscription`)} /> : null}
          <StudentProfileActions student={student} guardian={guardians[0]} enrollment={enrollment} onSaved={reload} />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex items-center gap-4">
            <StudentAvatarUpload institutionId={institutionId} studentId={student.id} firstName={student.first_name} lastName={student.last_name} path={student.photo_url} onSaved={reload} />
            <div>
              <div className="flex flex-wrap gap-2"><Tag value={active ? "Élève actif" : "Élève inactif"} severity={active ? "success" : "warning"} /><Tag value={enrollmentLabels[enrollment?.status ?? "draft"] ?? enrollment?.status ?? "Sans inscription"} severity={enrollment?.status === "confirmed" ? "success" : "info"} /></div>
              <h1 className="mt-2 text-2xl font-bold text-slate-950">{fullName}</h1>
              <p className="mt-1 text-sm text-slate-500">{student.matricule} · {year?.name ?? "Année non définie"}{age !== null ? ` · ${age} ans` : ""}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[ ["Cycle", enrollment?.cycle_name_snapshot || "—"], ["Niveau", enrollment?.level_name_snapshot || "—"], ["Classe", enrollment && "class_name_snapshot" in enrollment ? String(enrollment.class_name_snapshot || "Non affectée") : "Non affectée"], ["Responsables", String(guardians.length)] ].map(([label, value]) => <div key={label} className="min-w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className="mt-1 block truncate text-sm text-slate-900">{value}</strong></div>)}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex min-w-max gap-1 overflow-x-auto border-b border-slate-200 px-3" aria-label="Sections du dossier élève">
          {tabs.map((tab) => <button key={tab.id} type="button" className={`relative inline-flex h-12 items-center gap-2 px-3 text-sm font-medium ${activeTab === tab.id ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"}`} onClick={() => setActiveTab(tab.id)}><i className={`pi ${tab.icon} text-xs`} />{tab.label}{activeTab === tab.id ? <span className="absolute inset-x-3 bottom-0 h-0.5 bg-emerald-500" /> : null}</button>)}
        </nav>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" ? <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 p-4"><h2 className="text-base font-semibold">Identité</h2><dl className="mt-3 divide-y divide-slate-100">{[["Date de naissance", formatDate(student.birth_date)], ["Lieu de naissance", student.birth_place || "Non renseigné"], ["Nationalité", student.nationality || "Non renseignée"], ["Adresse", student.address || "Non renseignée"]].map(([label, value]) => <div key={label} className="grid gap-2 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl></section>
            <section className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">État du dossier</h2><p className="text-sm text-slate-500">État administratif et actions disponibles.</p></div><Button label="Ouvrir l’inscription" icon="pi pi-arrow-right" text onClick={() => void navigate("/scolarite/inscriptions")} /></div><div className="mt-4 space-y-3"><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">État de l’élève</span><strong className="block text-sm">{active ? "Actif" : "Inactif"}</strong></div><div className="rounded-lg bg-slate-50 p-3"><span className="text-xs text-slate-500">Inscription annuelle</span><strong className="block text-sm">{enrollmentLabels[enrollment?.status ?? "draft"] ?? "Sans inscription"}</strong></div></div></section>
          </div> : null}

          {activeTab === "guardians" ? <GuardianManagementPanel studentId={student.id} guardians={guardians} onAdd={() => setGuardianDialog(true)} onSaved={reload} /> : null}
          {activeTab === "schooling" ? enrollment ? <StudentClassAssignment enrollmentId={enrollment.id} yearId={yearId} annualLevelId={enrollment.academic_year_level_id} /> : <Message severity="info" text="Aucune inscription active." /> : null}
          {activeTab === "attendance" ? enrollment ? <StudentAttendancePanel institutionId={institutionId} yearId={yearId} enrollmentId={enrollment.id} /> : <Message severity="info" text="Une inscription active est nécessaire." /> : null}
          {activeTab === "results" ? <StudentResultsPanel institutionId={institutionId} yearId={yearId} studentId={student.id} /> : null}
          {activeTab === "documents" ? enrollment ? <StudentDocumentsPanel institutionId={institutionId} studentId={student.id} enrollmentId={enrollment.id} yearId={yearId} /> : <Message severity="info" text="Une inscription active est nécessaire." /> : null}
          {activeTab === "finances" ? <StudentFinancePanel studentId={student.id} academicYearId={yearId} /> : null}
        </div>
      </section>

      <AddGuardianDialog visible={guardianDialog} institutionId={institutionId} studentId={student.id} onHide={() => setGuardianDialog(false)} onSaved={reload} />
    </div>
  );
}
