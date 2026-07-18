import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { AddGuardianDialog } from "../components/AddGuardianDialog";
import { StudentAvatarUpload } from "../components/StudentAvatarUpload";
import { StudentClassAssignment } from "../components/StudentClassAssignment";
import { StudentDocumentsPanel } from "../components/StudentDocumentsPanel";
import { StudentProfileActions } from "../components/StudentProfileActions";
import { getStudent } from "../services/schooling.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;
type ProfileTab = "overview" | "guardians" | "schooling" | "attendance" | "results" | "documents" | "finances";

type TabDefinition = { id: ProfileTab; label: string; icon: string };

const tabs: TabDefinition[] = [
  { id: "overview", label: "Vue d’ensemble", icon: "pi-home" },
  { id: "guardians", label: "Responsables", icon: "pi-users" },
  { id: "schooling", label: "Parcours scolaire", icon: "pi-book" },
  { id: "attendance", label: "Assiduité", icon: "pi-calendar" },
  { id: "results", label: "Notes et bulletins", icon: "pi-chart-bar" },
  { id: "documents", label: "Documents", icon: "pi-file" },
  { id: "finances", label: "Finances", icon: "pi-wallet" },
];

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  pending: "En attente",
  confirmed: "Inscription confirmée",
  rejected: "Refusée",
  cancelled: "Annulée",
  transferred: "Transférée",
  withdrawn: "Retirée",
};

const statusClasses: Record<string, string> = {
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-red-200 bg-red-50 text-red-700",
  transferred: "border-blue-200 bg-blue-50 text-blue-700",
  withdrawn: "border-orange-200 bg-orange-50 text-orange-700",
};

const resetButtonClass = "appearance-none border-0 bg-transparent p-0 font-inherit text-inherit shadow-none outline-none";

const formatDate = (value?: string | null) => {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
};

const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="flex min-h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
    <div className="flex max-w-md flex-col items-center justify-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <i className={`pi ${icon} block text-base leading-none`} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  </div>
);

export function StudentProfilePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId, year, institutionId } = useAcademicSession();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [failure, setFailure] = useState("");
  const [guardianDialog, setGuardianDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  useEffect(() => {
    if (!studentId || !yearId) return;
    setFailure("");
    setDetail(null);
    getStudent(studentId, yearId)
      .then(setDetail)
      .catch(() => setFailure("Impossible de charger la fiche élève."));
  }, [studentId, yearId]);

  const reload = async () => {
    if (!studentId || !yearId) return;
    setDetail(await getStudent(studentId, yearId));
  };

  const age = useMemo(() => {
    const birthDate = detail?.student.birth_date;
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let value = today.getFullYear() - birth.getFullYear();
    const birthdayPassed = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!birthdayPassed) value -= 1;
    return value;
  }, [detail?.student.birth_date]);

  if (failure) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{failure}</div>;
  }

  if (!detail) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <div className="text-center">
          <span className="mx-auto grid size-11 animate-pulse place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><i className="pi pi-user" /></span>
          <p className="mt-3 text-sm font-medium text-slate-600">Chargement du dossier élève…</p>
        </div>
      </div>
    );
  }

  const { student, enrollment, guardians } = detail;
  const primaryGuardian = guardians[0];
  const fullName = `${student.first_name} ${student.last_name}`;
  const status = enrollment?.status ?? "draft";

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={`${resetButtonClass} inline-flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-300`}
          onClick={() => void navigate("/scolarite/eleves")}
        >
          <i className="pi pi-arrow-left text-xs" />
          Retour aux élèves
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {enrollment?.status === "confirmed" ? (
            <button
              type="button"
              className={`${resetButtonClass} inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-300`}
              onClick={() => void navigate(`/scolarite/eleves/${studentId}/reinscription`)}
            >
              <i className="pi pi-refresh text-xs" />Réinscrire
            </button>
          ) : null}
          <StudentProfileActions student={student} guardian={primaryGuardian} enrollment={enrollment} onSaved={reload} />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-emerald-700 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_34%),linear-gradient(135deg,rgba(5,150,105,0.96),rgba(4,120,87,0.94))]" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-5 lg:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded-2xl bg-white/12 p-1 ring-1 ring-white/20">
                <StudentAvatarUpload institutionId={institutionId} studentId={student.id} firstName={student.first_name} lastName={student.last_name} path={student.photo_url} onSaved={reload} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Dossier élève</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] ?? statusClasses.draft}`}>{statusLabels[status] ?? status}</span>
                </div>
                <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-white">{fullName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-emerald-50/90">
                  <span className="inline-flex items-center gap-2"><i className="pi pi-id-card text-emerald-100" />{student.matricule}</span>
                  <span className="inline-flex items-center gap-2"><i className="pi pi-calendar text-emerald-100" />{year?.name ?? "Année non définie"}</span>
                  {age !== null ? <span className="inline-flex items-center gap-2"><i className="pi pi-user text-emerald-100" />{age} ans</span> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[500px]">
              {[
                ["Cycle", enrollment?.cycle_name_snapshot || "—", "pi-sitemap"],
                ["Niveau", enrollment?.level_name_snapshot || "—", "pi-chart-bar"],
                ["Classe", enrollment?.class_name_snapshot || "Non affectée", "pi-users"],
                ["Responsables", String(guardians.length), "pi-user-plus"],
              ].map(([label, value, icon]) => (
                <div key={label} className="flex min-h-[68px] flex-col justify-center rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/15">
                  <div className="flex items-center justify-between gap-2 text-emerald-50"><span className="text-[10px] font-bold uppercase tracking-[0.1em]">{label}</span><i className={`pi ${icon} text-[11px]`} /></div>
                  <strong className="mt-1.5 block truncate text-sm font-semibold text-white">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto border-b border-slate-200 px-3">
          <nav className="flex min-w-max items-center gap-1" aria-label="Sections du dossier élève">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${resetButtonClass} relative inline-flex h-12 cursor-pointer items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 ${active ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`pi ${tab.icon} text-xs`} />{tab.label}
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" /> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" ? (
            <div className="grid items-stretch gap-4 xl:grid-cols-2">
              <section className="flex h-full flex-col rounded-2xl border border-slate-200 p-5">
                <h2 className="text-base font-semibold text-slate-950">Identité de l’élève</h2>
                <dl className="mt-4 grid flex-1 auto-rows-fr gap-x-6 gap-y-4 sm:grid-cols-2">
                  {[["Date de naissance", formatDate(student.birth_date)], ["Lieu de naissance", student.birth_place || "Non renseigné"], ["Nationalité", student.nationality || "Non renseignée"], ["Adresse", student.address || "Non renseignée"]].map(([label, value]) => (
                    <div key={label} className="flex min-h-[62px] flex-col justify-center border-b border-slate-100 pb-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div>
                  ))}
                </dl>
              </section>

              <section className="flex h-full flex-col rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-950">Responsable principal</h2>
                  <button type="button" className={`${resetButtonClass} grid size-9 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700`} onClick={() => setGuardianDialog(true)} aria-label="Ajouter un responsable"><i className="pi pi-user-plus text-sm" /></button>
                </div>
                {primaryGuardian ? (
                  <div className="mt-4 flex flex-1 flex-col justify-center rounded-2xl bg-slate-950 p-4 text-white"><strong className="block text-sm">{primaryGuardian.first_name} {primaryGuardian.last_name}</strong><div className="mt-3 text-sm text-slate-300"><i className="pi pi-phone mr-2 text-emerald-300" />{primaryGuardian.primary_phone || "Téléphone non renseigné"}</div></div>
                ) : <div className="mt-4 flex flex-1 items-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Aucun responsable principal n’est renseigné.</div>}
              </section>

              <section className="flex h-full flex-col rounded-2xl border border-slate-200 p-5 xl:col-span-2">
                <h2 className="text-base font-semibold text-slate-950">Inscription de l’année</h2>
                <div className="mt-4 grid flex-1 gap-3 sm:grid-cols-3">
                  {[["Cycle", enrollment?.cycle_name_snapshot || "—"], ["Niveau", enrollment?.level_name_snapshot || "—"], ["Classe", enrollment?.class_name_snapshot || "Non affectée"]].map(([label, value]) => (
                    <div key={label} className="flex min-h-[84px] flex-col justify-center rounded-xl bg-slate-50 p-4"><span className="text-xs text-slate-400">{label}</span><strong className="mt-1 block truncate text-sm text-slate-900">{value}</strong></div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "guardians" ? (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-950">Responsables de l’élève</h2><button type="button" className={`${resetButtonClass} inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700`} onClick={() => setGuardianDialog(true)}><i className="pi pi-user-plus text-xs" />Ajouter</button></div>
              {guardians.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{guardians.map((guardian, index) => <article key={guardian.id} className="rounded-2xl border border-slate-200 p-4"><strong className="text-sm text-slate-900">{guardian.first_name} {guardian.last_name}</strong>{index === 0 ? <span className="ml-2 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Principal</span> : null}<div className="mt-3 text-sm text-slate-600"><i className="pi pi-phone mr-2 text-emerald-500" />{guardian.primary_phone || "Non renseigné"}</div></article>)}</div> : <EmptyState icon="pi-users" title="Aucun responsable" description="Ajoutez au moins une personne à contacter." />}
            </div>
          ) : null}

          {activeTab === "schooling" ? (enrollment ? <StudentClassAssignment enrollmentId={enrollment.id} yearId={yearId} annualLevelId={enrollment.academic_year_level_id} /> : <EmptyState icon="pi-book" title="Aucune inscription active" description="Le parcours scolaire apparaîtra ici dès qu’une inscription sera créée." />) : null}
          {activeTab === "attendance" ? <EmptyState icon="pi-calendar" title="Aucune donnée d’assiduité" description="Les absences et retards seront regroupés ici." /> : null}
          {activeTab === "results" ? <EmptyState icon="pi-chart-bar" title="Résultats indisponibles" description="Les notes et bulletins seront visibles après l’ouverture du module." /> : null}
          {activeTab === "documents" ? (enrollment ? <StudentDocumentsPanel institutionId={institutionId} studentId={student.id} enrollmentId={enrollment.id} /> : <EmptyState icon="pi-file" title="Aucun dossier documentaire" description="Une inscription active est nécessaire." />) : null}
          {activeTab === "finances" ? <EmptyState icon="pi-wallet" title="Situation financière à venir" description="Les frais, paiements et soldes seront présentés ici." /> : null}
        </div>
      </section>

      <AddGuardianDialog visible={guardianDialog} institutionId={institutionId} studentId={student.id} onHide={() => setGuardianDialog(false)} onSaved={reload} />
    </div>
  );
}
