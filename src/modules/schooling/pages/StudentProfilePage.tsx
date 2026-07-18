import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { StudentFinancePanel } from "../../financial-management/components/StudentFinancePanel";
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
  { id: "finances", label: "Situation financière", icon: "pi-wallet" },
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

  if (failure) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{failure}</div>;

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
  const stats = [
    ["Cycle", enrollment?.cycle_name_snapshot || "—", "pi-sitemap"],
    ["Niveau", enrollment?.level_name_snapshot || "—", "pi-chart-bar"],
    ["Classe", enrollment?.class_name_snapshot || "Non affectée", "pi-users"],
    ["Responsables", String(guardians.length), "pi-user-plus"],
  ];

  const identityFields = [
    ["Date de naissance", formatDate(student.birth_date)],
    ["Lieu de naissance", student.birth_place || "Non renseigné"],
    ["Nationalité", student.nationality || "Non renseignée"],
    ["Adresse", student.address || "Non renseignée"],
  ];

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={`${resetButtonClass} inline-flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-300`} onClick={() => void navigate("/scolarite/eleves")}>
          <i className="pi pi-arrow-left text-xs" />Retour aux élèves
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {enrollment?.status === "confirmed" ? (
            <button type="button" className={`${resetButtonClass} inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-300`} onClick={() => void navigate(`/scolarite/eleves/${studentId}/reinscription`)}>
              <i className="pi pi-refresh text-xs" />Réinscrire
            </button>
          ) : null}
          <StudentProfileActions student={student} guardian={primaryGuardian} enrollment={enrollment} onSaved={reload} />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="pointer-events-none absolute -right-20 -top-28 size-64 rounded-full border border-emerald-300/40" />
        <div className="pointer-events-none absolute right-20 top-8 size-28 rounded-full border border-emerald-300/25" />
        <div className="pointer-events-none absolute right-[34%] -bottom-24 size-48 rounded-full border border-emerald-200/30" />
        <div className="pointer-events-none absolute right-8 top-7 text-[112px] text-emerald-500/[0.035]"><i className="pi pi-id-card" /></div>
        <div className="relative px-5 py-4 sm:px-6 lg:px-7">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded-2xl bg-emerald-50 p-1 ring-1 ring-emerald-100">
                <StudentAvatarUpload institutionId={institutionId} studentId={student.id} firstName={student.first_name} lastName={student.last_name} path={student.photo_url} onSaved={reload} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-inset ring-emerald-100">Dossier élève</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] ?? statusClasses.draft}`}>{statusLabels[status] ?? status}</span>
                </div>
                <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">{fullName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2"><i className="pi pi-id-card text-emerald-500" />{student.matricule}</span>
                  <span className="inline-flex items-center gap-2"><i className="pi pi-calendar text-emerald-500" />{year?.name ?? "Année non définie"}</span>
                  {age !== null ? <span className="inline-flex items-center gap-2"><i className="pi pi-user text-emerald-500" />{age} ans</span> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[470px] xl:self-start">
              {stats.map(([label, value, icon]) => (
                <div key={label} className="flex min-h-[58px] flex-col justify-center rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2 text-slate-400"><span className="text-[10px] font-bold uppercase tracking-[0.1em]">{label}</span><i className={`pi ${icon} text-[11px] text-emerald-500`} /></div>
                  <strong className="mt-1 block truncate text-sm font-semibold text-slate-900">{value}</strong>
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
                <button key={tab.id} type="button" className={`${resetButtonClass} relative inline-flex h-12 cursor-pointer items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-300 ${active ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"}`} onClick={() => setActiveTab(tab.id)}>
                  <i className={`pi ${tab.icon} text-xs`} />{tab.label}
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" /> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><i className="pi pi-id-card text-sm" /></span>
                  <div><p className="text-xs font-medium text-slate-400">Informations personnelles</p><h2 className="text-base font-semibold text-slate-950">Identité de l’élève</h2></div>
                </div>
                <dl className="divide-y divide-slate-100">
                  {identityFields.map(([label, value]) => (
                    <div key={label} className="grid items-center gap-2 py-3.5 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
                      <dt className="text-sm font-medium text-slate-500">{label}</dt>
                      <dd className="min-w-0 text-sm font-semibold leading-5 text-slate-900 sm:text-left">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><i className="pi pi-users text-sm" /></span>
                    <div><p className="text-xs font-medium text-slate-400">Contact prioritaire</p><h2 className="text-base font-semibold text-slate-950">Responsable principal</h2></div>
                  </div>
                  <button type="button" className={`${resetButtonClass} grid size-9 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700`} onClick={() => setGuardianDialog(true)} aria-label="Ajouter un responsable"><i className="pi pi-user-plus text-sm" /></button>
                </div>
                {primaryGuardian ? (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
                    <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{primaryGuardian.first_name[0]}{primaryGuardian.last_name[0]}</span><div><strong className="block text-sm text-slate-900">{primaryGuardian.first_name} {primaryGuardian.last_name}</strong><span className="text-xs text-slate-400">Responsable principal</span></div></div>
                    <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600"><i className="pi pi-phone mr-2 text-emerald-500" />{primaryGuardian.primary_phone || "Téléphone non renseigné"}</div>
                  </div>
                ) : <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Aucun responsable principal n’est renseigné.</div>}
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
          {activeTab === "finances" ? <StudentFinancePanel studentId={student.id} academicYearId={yearId} /> : null}
        </div>
      </section>

      <AddGuardianDialog visible={guardianDialog} institutionId={institutionId} studentId={student.id} onHide={() => setGuardianDialog(false)} onSaved={reload} />
    </div>
  );
}
