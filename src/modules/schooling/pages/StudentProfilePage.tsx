import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { AddGuardianDialog } from "../components/AddGuardianDialog";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { SchoolingPanel } from "../components/SchoolingPanel";
import { StudentAvatarUpload } from "../components/StudentAvatarUpload";
import { StudentClassAssignment } from "../components/StudentClassAssignment";
import { StudentDocumentsPanel } from "../components/StudentDocumentsPanel";
import { StudentProfileActions } from "../components/StudentProfileActions";
import { getStudent } from "../services/schooling.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;

const infoCardClass = "rounded-xl border border-emerald-100 bg-white p-4 shadow-sm";

export function StudentProfilePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId, year, institutionId } = useAcademicSession();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [failure, setFailure] = useState("");
  const [guardianDialog, setGuardianDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!studentId || !yearId) return;
    getStudent(studentId, yearId)
      .then(setDetail)
      .catch(() => setFailure("Impossible de charger la fiche élève."));
  }, [studentId, yearId]);

  const reload = async () => {
    if (!studentId || !yearId) return;
    setDetail(await getStudent(studentId, yearId));
  };

  if (failure) return <Message severity="error" text={failure} />;
  if (!detail) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <ProgressSpinner />
      </div>
    );
  }

  const { student, enrollment, guardians } = detail;
  const primaryGuardian = guardians[0];

  return (
    <SchoolingPanel
      path={`Scolarité · Élèves · ${student.first_name} ${student.last_name}`}
      title={`${student.first_name} ${student.last_name}`}
      description={
        enrollment
          ? `${student.matricule} · ${enrollment.cycle_name_snapshot} · ${enrollment.level_name_snapshot}${year?.name ? ` · ${year.name}` : ""}`
          : `${student.matricule} · Aucune inscription pour l’année active`
      }
      meta={
        enrollment ? (
          <EnrollmentStatusTag
            status={
              enrollment.status as Parameters<typeof EnrollmentStatusTag>[0]["status"]
            }
          />
        ) : undefined
      }
      actions={
        <>
          {enrollment?.status === "confirmed" ? (
            <Button
              label="Réinscrire"
              icon="pi pi-refresh"
              size="small"
              outlined
              onClick={() =>
                void navigate(`/scolarite/eleves/${studentId}/reinscription`)
              }
            />
          ) : null}
          <StudentProfileActions
            student={student}
            guardian={primaryGuardian}
            enrollment={enrollment}
            onSaved={reload}
          />
        </>
      }
      backLabel="Retour aux élèves"
      onBack={() => void navigate("/scolarite/eleves")}
    >
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-5 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
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
                  <h2 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {student.first_name} {student.last_name}
                  </h2>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-emerald-100/80">
                  <span className="rounded-lg bg-white/10 px-2 py-1 font-medium text-white">
                    {student.matricule}
                  </span>
                  <span>
                    {enrollment
                      ? `${enrollment.cycle_name_snapshot} · ${enrollment.level_name_snapshot}`
                      : "Aucune inscription"}
                  </span>
                  {year?.name ? <span>· {year.name}</span> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-100/60">Responsables</span>
                <strong className="mt-1 block text-lg">{guardians.length}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-100/60">Niveau</span>
                <strong className="mt-1 block truncate text-sm">{enrollment?.level_name_snapshot || "—"}</strong>
              </div>
              <div className="col-span-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 sm:col-span-1">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-100/60">Année</span>
                <strong className="mt-1 block truncate text-sm">{year?.name || "—"}</strong>
              </div>
            </div>
          </div>
        </div>

        <TabView
          activeIndex={activeTab}
          onTabChange={(event) => setActiveTab(event.index)}
          className="[&_.p-tabview-nav]:border-0 [&_.p-tabview-nav]:px-3 [&_.p-tabview-nav-link]:px-3 [&_.p-tabview-nav-link]:py-3 [&_.p-tabview-panels]:bg-emerald-50/30 [&_.p-tabview-panels]:p-4 sm:[&_.p-tabview-panels]:p-6"
        >
          <TabPanel header="Vue d’ensemble" leftIcon="pi pi-home mr-2">
            <div className="grid gap-4 xl:grid-cols-3">
              <section className={infoCardClass}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><i className="pi pi-id-card" /></span>
                  <div><h2 className="text-sm font-semibold text-slate-900">Identité</h2><p className="text-xs text-slate-500">Informations personnelles</p></div>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Date de naissance</dt><dd className="text-right font-medium text-slate-900">{student.birth_date || "Non renseignée"}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Lieu de naissance</dt><dd className="text-right font-medium text-slate-900">{student.birth_place || "Non renseigné"}</dd></div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Nationalité</dt><dd className="text-right font-medium text-slate-900">{student.nationality || "—"}</dd></div>
                  <div><dt className="text-slate-500">Adresse</dt><dd className="mt-1 font-medium text-slate-900">{student.address || "Non renseignée"}</dd></div>
                </dl>
              </section>

              <section className={infoCardClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><i className="pi pi-users" /></span>
                    <div><h2 className="text-sm font-semibold text-slate-900">Responsable principal</h2><p className="text-xs text-slate-500">Contact prioritaire</p></div>
                  </div>
                  <Button icon="pi pi-user-plus" text rounded size="small" aria-label="Ajouter un responsable" onClick={() => setGuardianDialog(true)} />
                </div>
                {primaryGuardian ? (
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-full bg-emerald-700 font-semibold text-white">{primaryGuardian.first_name[0]}{primaryGuardian.last_name[0]}</span>
                      <div><strong className="block text-sm text-slate-900">{primaryGuardian.first_name} {primaryGuardian.last_name}</strong><span className="text-xs text-slate-500">Responsable principal</span></div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-700"><i className="pi pi-phone text-emerald-700" />{primaryGuardian.primary_phone || "Téléphone non renseigné"}</div>
                  </div>
                ) : <Message severity="warn" text="Aucun responsable principal" />}
              </section>

              <section className={infoCardClass}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><i className="pi pi-graduation-cap" /></span>
                  <div><h2 className="text-sm font-semibold text-slate-900">Scolarité</h2><p className="text-xs text-slate-500">Situation pour l’année active</p></div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-100 p-3"><span className="block text-xs text-slate-500">Cycle</span><strong className="mt-1 block text-sm text-slate-900">{enrollment?.cycle_name_snapshot || "—"}</strong></div>
                  <div className="rounded-lg border border-slate-100 p-3"><span className="block text-xs text-slate-500">Niveau</span><strong className="mt-1 block text-sm text-slate-900">{enrollment?.level_name_snapshot || "—"}</strong></div>
                  <div className="rounded-lg border border-slate-100 p-3"><span className="block text-xs text-slate-500">Classe</span><strong className="mt-1 block text-sm text-slate-900">Non affecté</strong></div>
                </div>
              </section>
            </div>
          </TabPanel>

          <TabPanel header="Responsables" leftIcon="pi pi-users mr-2">
            <div className="mb-4 flex justify-end"><Button label="Ajouter un responsable" icon="pi pi-user-plus" size="small" onClick={() => setGuardianDialog(true)} /></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {guardians.map((guardian, index) => (
                <article className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm" key={guardian.id}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-800">{guardian.first_name[0]}{guardian.last_name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-slate-900">{guardian.first_name} {guardian.last_name}</strong>{index === 0 ? <Tag value="Principal" severity="success" /> : null}</div>
                      <span className="mt-1 block text-xs text-slate-500"><i className="pi pi-phone mr-1" />{guardian.primary_phone || "Non renseigné"}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </TabPanel>

          <TabPanel header="Parcours scolaire" leftIcon="pi pi-book mr-2">
            <div className="space-y-4">
              {enrollment ? <StudentClassAssignment enrollmentId={enrollment.id} yearId={yearId} annualLevelId={enrollment.academic_year_level_id} /> : <Message severity="info" text="Aucune inscription pour cette année." />}
              <Message severity="info" text="Les changements de classe et réinscriptions restent conservés dans l’historique annuel." />
            </div>
          </TabPanel>

          <TabPanel header="Assiduité" leftIcon="pi pi-calendar mr-2"><Message severity="info" text="Aucune absence enregistrée pour cette année." /></TabPanel>
          <TabPanel header="Notes et bulletins" leftIcon="pi pi-chart-bar mr-2"><Message severity="info" text="Les résultats seront disponibles après ouverture du module Notes." /></TabPanel>
          <TabPanel header="Documents" leftIcon="pi pi-file mr-2">
            {enrollment ? <StudentDocumentsPanel institutionId={institutionId} studentId={student.id} enrollmentId={enrollment.id} /> : <Message severity="info" text="Aucune inscription pour cette année." />}
          </TabPanel>
          <TabPanel header="Finances" leftIcon="pi pi-wallet mr-2"><Message severity="info" text="Les frais d’inscription seront affichés dans le prochain lot Finance scolaire." /></TabPanel>
        </TabView>
      </section>

      <AddGuardianDialog
        visible={guardianDialog}
        institutionId={institutionId}
        studentId={student.id}
        onHide={() => setGuardianDialog(false)}
        onSaved={reload}
      />
    </SchoolingPanel>
  );
}
