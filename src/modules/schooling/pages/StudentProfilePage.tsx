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

type TabDefinition = {
  id: ProfileTab;
  label: string;
  icon: string;
};

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

const formatDate = (value?: string | null) => {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
};

const EmptyState = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
    <div>
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        <i className={`pi ${icon} text-lg`} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
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
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <div className="flex items-start gap-3">
          <i className="pi pi-exclamation-circle mt-0.5" />
          <div>
            <strong className="block font-semibold">Chargement impossible</strong>
            <span className="mt-1 block text-red-600">{failure}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <span className="mx-auto grid size-12 animate-pulse place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <i className="pi pi-user text-lg" />
          </span>
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
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
          onClick={() => void navigate("/scolarite/eleves")}
        >
          <i className="pi pi-arrow-left text-xs" />
          Retour aux élèves
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {enrollment?.status === "confirmed" ? (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
              onClick={() => void navigate(`/scolarite/eleves/${studentId}/reinscription`)}
            >
              <i className="pi pi-refresh text-xs" />
              Réinscrire
            </button>
          ) : null}
          <StudentProfileActions student={student} guardian={primaryGuardian} enrollment={enrollment} onSaved={reload} />
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,1),rgba(6,78,59,0.96))]" />
        <div className="absolute -right-20 -top-24 size-72 rounded-full border border-white/10" />
        <div className="absolute -right-6 -top-10 size-48 rounded-full border border-white/10" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded-3xl bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur">
                <StudentAvatarUpload
                  institutionId={institutionId}
                  studentId={student.id}
                  firstName={student.first_name}
                  lastName={student.last_name}
                  path={student.photo_url}
                  onSaved={reload}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                    Dossier élève
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status] ?? statusClasses.draft}`}>
                    {statusLabels[status] ?? status}
                  </span>
                </div>
                <h1 className="mt-3 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{fullName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2"><i className="pi pi-id-card text-emerald-300" />{student.matricule}</span>
                  <span className="inline-flex items-center gap-2"><i className="pi pi-calendar text-emerald-300" />{year?.name ?? "Année non définie"}</span>
                  {age !== null ? <span className="inline-flex items-center gap-2"><i className="pi pi-user text-emerald-300" />{age} ans</span> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
              {[
                { label: "Cycle", value: enrollment?.cycle_name_snapshot || "—", icon: "pi-sitemap" },
                { label: "Niveau", value: enrollment?.level_name_snapshot || "—", icon: "pi-chart-bar" },
                { label: "Classe", value: enrollment?.class_name_snapshot || "Non affectée", icon: "pi-users" },
                { label: "Responsables", value: String(guardians.length), icon: "pi-user-plus" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2 text-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{item.label}</span>
                    <i className={`pi ${item.icon} text-xs`} />
                  </div>
                  <strong className="mt-2 block truncate text-sm font-semibold text-white">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto border-b border-slate-200 px-2">
          <nav className="flex min-w-max items-center gap-1" aria-label="Sections du dossier élève">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`relative inline-flex h-14 items-center gap-2 px-3 text-sm font-medium transition ${active ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`pi ${tab.icon} text-xs`} />
                  {tab.label}
                  {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-emerald-500" /> : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Informations personnelles</span>
                      <h2 className="mt-1 text-base font-semibold text-slate-950">Identité de l’élève</h2>
                    </div>
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><i className="pi pi-id-card" /></span>
                  </div>
                  <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    {[
                      ["Date de naissance", formatDate(student.birth_date)],
                      ["Lieu de naissance", student.birth_place || "Non renseigné"],
                      ["Nationalité", student.nationality || "Non renseignée"],
                      ["Adresse", student.address || "Non renseignée"],
                    ].map(([label, value]) => (
                      <div key={label} className="border-b border-slate-100 pb-4 last:border-0 sm:last:border-b">
                        <dt className="text-xs font-medium text-slate-400">{label}</dt>
                        <dd className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Situation scolaire</span>
                      <h2 className="mt-1 text-base font-semibold text-slate-950">Inscription de l’année</h2>
                    </div>
                    <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><i className="pi pi-graduation-cap" /></span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["Cycle", enrollment?.cycle_name_snapshot || "—"],
                      ["Niveau", enrollment?.level_name_snapshot || "—"],
                      ["Classe", enrollment?.class_name_snapshot || "Non affectée"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
                        <span className="text-xs font-medium text-slate-400">{label}</span>
                        <strong className="mt-1 block truncate text-sm text-slate-900">{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Contact prioritaire</span>
                      <h2 className="mt-1 text-base font-semibold text-slate-950">Responsable principal</h2>
                    </div>
                    <button
                      type="button"
                      className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Ajouter un responsable"
                      onClick={() => setGuardianDialog(true)}
                    >
                      <i className="pi pi-user-plus text-sm" />
                    </button>
                  </div>
                  {primaryGuardian ? (
                    <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                          {primaryGuardian.first_name[0]}{primaryGuardian.last_name[0]}
                        </span>
                        <div className="min-w-0">
                          <strong className="block truncate text-sm">{primaryGuardian.first_name} {primaryGuardian.last_name}</strong>
                          <span className="mt-0.5 block text-xs text-slate-400">Responsable principal</span>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-300">
                        <i className="pi pi-phone mr-2 text-emerald-300" />
                        {primaryGuardian.primary_phone || "Téléphone non renseigné"}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Aucun responsable principal n’est renseigné.</div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">Complétude du dossier</span>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">Points d’attention</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      { ok: Boolean(student.birth_date), label: "Date de naissance renseignée" },
                      { ok: guardians.length > 0, label: "Au moins un responsable associé" },
                      { ok: Boolean(enrollment?.class_name_snapshot), label: "Classe affectée" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full ${item.ok ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          <i className={`pi ${item.ok ? "pi-check" : "pi-exclamation-triangle"} text-[10px]`} />
                        </span>
                        <span className={item.ok ? "text-slate-600" : "font-medium text-slate-900"}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          ) : null}

          {activeTab === "guardians" ? (
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Responsables de l’élève</h2>
                  <p className="mt-1 text-sm text-slate-500">Contacts autorisés et personnes à prévenir.</p>
                </div>
                <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700" onClick={() => setGuardianDialog(true)}>
                  <i className="pi pi-user-plus text-xs" />Ajouter un responsable
                </button>
              </div>
              {guardians.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {guardians.map((guardian, index) => (
                    <article key={guardian.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                            {guardian.first_name[0]}{guardian.last_name[0]}
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-slate-900">{guardian.first_name} {guardian.last_name}</strong>
                            <span className="mt-0.5 block text-xs text-slate-400">Responsable {index + 1}</span>
                          </div>
                        </div>
                        {index === 0 ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Principal</span> : null}
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600"><i className="pi pi-phone mr-2 text-emerald-500" />{guardian.primary_phone || "Téléphone non renseigné"}</div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState icon="pi-users" title="Aucun responsable" description="Ajoutez au moins une personne à contacter pour compléter le dossier de l’élève." />}
            </div>
          ) : null}

          {activeTab === "schooling" ? (
            enrollment ? <StudentClassAssignment enrollmentId={enrollment.id} yearId={yearId} annualLevelId={enrollment.academic_year_level_id} /> : <EmptyState icon="pi-book" title="Aucune inscription active" description="Le parcours scolaire apparaîtra ici dès qu’une inscription sera créée pour cette année." />
          ) : null}

          {activeTab === "attendance" ? <EmptyState icon="pi-calendar" title="Aucune donnée d’assiduité" description="Les absences, retards et justificatifs de cette année seront regroupés dans cet espace." /> : null}
          {activeTab === "results" ? <EmptyState icon="pi-chart-bar" title="Résultats indisponibles" description="Les notes, moyennes et bulletins seront visibles après l’ouverture du module d’évaluation." /> : null}
          {activeTab === "documents" ? (enrollment ? <StudentDocumentsPanel institutionId={institutionId} studentId={student.id} enrollmentId={enrollment.id} /> : <EmptyState icon="pi-file" title="Aucun dossier documentaire" description="Une inscription active est nécessaire pour rattacher les documents de l’année." />) : null}
          {activeTab === "finances" ? <EmptyState icon="pi-wallet" title="Situation financière à venir" description="Les frais, échéances, paiements et soldes de l’élève seront présentés dans cet espace." /> : null}
        </div>
      </section>

      <AddGuardianDialog visible={guardianDialog} institutionId={institutionId} studentId={student.id} onHide={() => setGuardianDialog(false)} onSaved={reload} />
    </div>
  );
}
