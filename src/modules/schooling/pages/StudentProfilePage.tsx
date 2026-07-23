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
type ProfileTab =
  | "overview"
  | "guardians"
  | "schooling"
  | "attendance"
  | "results"
  | "documents"
  | "finances";

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "guardians", label: "Responsables" },
  { id: "schooling", label: "Parcours scolaire" },
  { id: "attendance", label: "Assiduité" },
  { id: "results", label: "Notes et bulletins" },
  { id: "documents", label: "Documents" },
  { id: "finances", label: "Situation financière" },
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

const buttonReset =
  "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";

const formatDate = (value?: string | null) => {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
};

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
    void getStudent(studentId, yearId)
      .then(setDetail)
      .catch(() => setFailure("Impossible de charger la fiche élève."));
  }, [studentId, yearId]);

  const age = useMemo(() => {
    if (!detail?.student.birth_date) return null;
    const birth = new Date(detail.student.birth_date);
    const now = new Date();
    return (
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
    );
  }, [detail?.student.birth_date]);

  if (failure) return <Message severity="error" text={failure} />;
  if (!detail) {
    return (
      <div className="grid min-h-[55vh] place-items-center text-sm text-slate-500">
        Chargement du dossier élève…
      </div>
    );
  }

  const { student, enrollment, guardians } = detail;
  const fullName = `${student.first_name} ${student.last_name}`;
  const active = student.status === "active";
  const className =
    enrollment && "class_name_snapshot" in enrollment
      ? String(enrollment.class_name_snapshot || "Non affectée")
      : "Non affectée";

  const toggleStudentStatus = async () => {
    setChangingStatus(true);
    try {
      await changeStudentStatus(student.id, active ? "inactive" : "active");
      await reload();
    } finally {
      setChangingStatus(false);
    }
  };

  const stats = [
    ["Cycle", enrollment?.cycle_name_snapshot || "—"],
    ["Niveau", enrollment?.level_name_snapshot || "—"],
    ["Classe", className],
    ["Responsables", String(guardians.length)],
  ];

  return (
    <div className="w-full space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <Button
          label="Retour aux élèves"
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          onClick={() => void navigate("/scolarite/eleves")}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            label={active ? "Désactiver" : "Activer"}
            icon={active ? "pi pi-pause" : "pi pi-check"}
            severity={active ? "warning" : "success"}
            outlined
            loading={changingStatus}
            onClick={() => void toggleStudentStatus()}
          />
          {enrollment?.status === "confirmed" ? (
            <Button
              label="Réinscrire"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              onClick={() => void navigate(`/scolarite/eleves/${studentId}/reinscription`)}
            />
          ) : null}
          <StudentProfileActions
            student={student}
            guardian={guardians[0]}
            enrollment={enrollment}
            onSaved={reload}
          />
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.8fr)] xl:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <StudentAvatarUpload
              institutionId={institutionId}
              studentId={student.id}
              firstName={student.first_name}
              lastName={student.last_name}
              path={student.photo_url}
              onSaved={reload}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <Tag value={active ? "Élève actif" : "Élève inactif"} severity={active ? "success" : "warning"} />
                <Tag
                  value={
                    enrollmentLabels[enrollment?.status ?? "draft"] ??
                    enrollment?.status ??
                    "Sans inscription"
                  }
                  severity={enrollment?.status === "confirmed" ? "success" : "info"}
                />
              </div>
              <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">{fullName}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {student.matricule} · {year?.name ?? "Année non définie"}
                {age !== null ? ` · ${age} ans` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="min-w-0 bg-white px-3 py-3">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</span>
                <strong className="mt-1 block truncate text-sm font-semibold text-slate-900">{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className="overflow-x-auto border-b border-slate-200 bg-white" aria-label="Sections du dossier élève">
        <div className="grid min-w-[980px] grid-cols-7">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${buttonReset} relative flex h-12 items-center justify-center px-3 text-center text-sm font-medium transition ${
                activeTab === tab.id
                  ? "text-emerald-700"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {activeTab === tab.id ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 bg-emerald-600" />
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <div className="min-w-0 w-full">
        {activeTab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="m-0 text-base font-semibold text-slate-950">Identité</h2>
                <p className="mt-1 text-xs text-slate-500">Informations personnelles du dossier.</p>
              </div>
              <dl className="divide-y divide-slate-100">
                {[
                  ["Date de naissance", formatDate(student.birth_date)],
                  ["Lieu de naissance", student.birth_place || "Non renseigné"],
                  ["Nationalité", student.nationality || "Non renseignée"],
                  ["Adresse", student.address || "Non renseignée"],
                ].map(([label, value]) => (
                  <div key={label} className="grid gap-2 py-3 sm:grid-cols-[160px_1fr]">
                    <dt className="text-sm text-slate-500">{label}</dt>
                    <dd className="m-0 text-sm font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="m-0 text-base font-semibold text-slate-950">Situation administrative</h2>
                  <p className="mt-1 text-xs text-slate-500">État de la personne et de son inscription annuelle.</p>
                </div>
                <Button
                  label="Ouvrir le workflow"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  text
                  onClick={() => void navigate("/scolarite/inscriptions")}
                />
              </div>
              <dl className="divide-y divide-slate-100">
                <div className="grid gap-2 py-3 sm:grid-cols-[180px_1fr]">
                  <dt className="text-sm text-slate-500">État de l’élève</dt>
                  <dd className="m-0 text-sm font-semibold text-slate-900">{active ? "Actif" : "Inactif"}</dd>
                </div>
                <div className="grid gap-2 py-3 sm:grid-cols-[180px_1fr]">
                  <dt className="text-sm text-slate-500">Inscription annuelle</dt>
                  <dd className="m-0 text-sm font-semibold text-slate-900">
                    {enrollmentLabels[enrollment?.status ?? "draft"] ?? "Sans inscription"}
                  </dd>
                </div>
                <div className="grid gap-2 py-3 sm:grid-cols-[180px_1fr]">
                  <dt className="text-sm text-slate-500">Classe actuelle</dt>
                  <dd className="m-0 text-sm font-semibold text-slate-900">{className}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : null}

        {activeTab === "guardians" ? (
          <GuardianManagementPanel
            studentId={student.id}
            guardians={guardians}
            onAdd={() => setGuardianDialog(true)}
            onSaved={reload}
          />
        ) : null}
        {activeTab === "schooling" ? (
          enrollment ? (
            <StudentClassAssignment
              enrollmentId={enrollment.id}
              yearId={yearId}
              annualLevelId={enrollment.academic_year_level_id}
            />
          ) : (
            <Message severity="info" text="Aucune inscription active." />
          )
        ) : null}
        {activeTab === "attendance" ? (
          enrollment ? (
            <StudentAttendancePanel
              institutionId={institutionId}
              yearId={yearId}
              enrollmentId={enrollment.id}
            />
          ) : (
            <Message severity="info" text="Une inscription active est nécessaire." />
          )
        ) : null}
        {activeTab === "results" ? (
          <StudentResultsPanel
            institutionId={institutionId}
            yearId={yearId}
            studentId={student.id}
          />
        ) : null}
        {activeTab === "documents" ? (
          enrollment ? (
            <StudentDocumentsPanel
              institutionId={institutionId}
              studentId={student.id}
              enrollmentId={enrollment.id}
              yearId={yearId}
            />
          ) : (
            <Message severity="info" text="Une inscription active est nécessaire." />
          )
        ) : null}
        {activeTab === "finances" ? (
          <StudentFinancePanel studentId={student.id} academicYearId={yearId} />
        ) : null}
      </div>

      <AddGuardianDialog
        visible={guardianDialog}
        institutionId={institutionId}
        studentId={student.id}
        onHide={() => setGuardianDialog(false)}
        onSaved={reload}
      />
    </div>
  );
}
