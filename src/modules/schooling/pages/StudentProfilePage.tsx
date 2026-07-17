import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabPanel, TabView } from "primereact/tabview";
import { useAcademicSession } from "../../../features/academic-session/components/academic-session-context";
import { EnrollmentStatusTag } from "../components/EnrollmentStatusTag";
import { StudentProfileActions } from "../components/StudentProfileActions";
import { AddGuardianDialog } from "../components/AddGuardianDialog";
import { StudentDocumentsPanel } from "../components/StudentDocumentsPanel";
import { StudentClassAssignment } from "../components/StudentClassAssignment";
import { StudentAvatarUpload } from "../components/StudentAvatarUpload";
import { getStudent } from "../services/schooling.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;

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
  if (!detail)
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );

  const { student, enrollment, guardians } = detail;

  return (
    <section className="student-profile-page space-y-3">
      <Button
        label="Retour aux élèves"
        icon="pi pi-arrow-left"
        size="small"
        text
        onClick={() => void navigate("/scolarite/eleves")}
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0">
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
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {student.first_name} {student.last_name}
                </h1>
                {enrollment && (
                  <EnrollmentStatusTag
                    status={
                      enrollment.status as Parameters<
                        typeof EnrollmentStatusTag
                      >[0]["status"]
                    }
                  />
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{student.matricule}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {enrollment
                    ? `${enrollment.cycle_name_snapshot} · ${enrollment.level_name_snapshot}`
                    : "Aucune inscription"}
                </span>
                {year?.name && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{year.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {enrollment?.status === "confirmed" && (
              <Button
                label="Réinscrire"
                icon="pi pi-refresh"
                size="small"
                outlined
                onClick={() =>
                  void navigate(`/scolarite/eleves/${studentId}/reinscription`)
                }
              />
            )}
            <StudentProfileActions
              student={student}
              guardian={guardians[0]}
              enrollment={enrollment}
              onSaved={reload}
            />
          </div>
        </div>

        <TabView
          activeIndex={activeTab}
          onTabChange={(event) => setActiveTab(event.index)}
          className="student-profile-tabs border-t border-slate-200 [&_.p-tabview-nav]:border-0 [&_.p-tabview-nav]:px-2 [&_.p-tabview-nav-link]:px-3 [&_.p-tabview-nav-link]:py-3 [&_.p-tabview-panels]:p-4 sm:[&_.p-tabview-panels]:p-5"
        >
          <TabPanel header="Vue d’ensemble" leftIcon="pi pi-home mr-2">
            <div className="profile-overview-grid">
              <section className="profile-section">
                <h2>Identité</h2>
                <dl className="profile-dl">
                  <div>
                    <dt>Date de naissance</dt>
                    <dd>{student.birth_date || "Non renseignée"}</dd>
                  </div>
                  <div>
                    <dt>Lieu de naissance</dt>
                    <dd>{student.birth_place || "Non renseigné"}</dd>
                  </div>
                  <div>
                    <dt>Nationalité</dt>
                    <dd>{student.nationality}</dd>
                  </div>
                  <div>
                    <dt>Adresse</dt>
                    <dd>{student.address || "Non renseignée"}</dd>
                  </div>
                </dl>
              </section>
              <section className="profile-section">
                <h2>Responsable principal</h2>
                {guardians[0] ? (
                  <dl className="profile-dl">
                    <div>
                      <dt>Nom</dt>
                      <dd>
                        {guardians[0].first_name} {guardians[0].last_name}
                      </dd>
                    </div>
                    <div>
                      <dt>Téléphone</dt>
                      <dd>{guardians[0].primary_phone}</dd>
                    </div>
                  </dl>
                ) : (
                  <Message severity="warn" text="Aucun responsable" />
                )}
              </section>
              <section className="profile-section">
                <h2>Scolarité</h2>
                <dl className="profile-dl">
                  <div>
                    <dt>Année</dt>
                    <dd>{year?.name}</dd>
                  </div>
                  <div>
                    <dt>Niveau</dt>
                    <dd>{enrollment?.level_name_snapshot || "—"}</dd>
                  </div>
                  <div>
                    <dt>Classe</dt>
                    <dd>Non affecté</dd>
                  </div>
                </dl>
              </section>
            </div>
          </TabPanel>

          <TabPanel header="Responsables" leftIcon="pi pi-users mr-2">
            <div className="panel-toolbar panel-toolbar-end">
              <Button
                label="Ajouter un responsable"
                icon="pi pi-user-plus"
                size="small"
                onClick={() => setGuardianDialog(true)}
              />
            </div>
            <div className="guardian-list">
              {guardians.map((guardian) => (
                <div className="guardian-line" key={guardian.id}>
                  <span className="student-avatar">
                    {guardian.first_name[0]}
                    {guardian.last_name[0]}
                  </span>
                  <div>
                    <strong>
                      {guardian.first_name} {guardian.last_name}
                    </strong>
                    <small>
                      <i className="pi pi-phone" /> {guardian.primary_phone}
                    </small>
                  </div>
                  <Button label="Modifier" icon="pi pi-pencil" text disabled />
                </div>
              ))}
            </div>
          </TabPanel>

          <TabPanel header="Parcours scolaire" leftIcon="pi pi-book mr-2">
            {enrollment && (
              <StudentClassAssignment
                enrollmentId={enrollment.id}
                yearId={yearId}
                annualLevelId={enrollment.academic_year_level_id}
              />
            )}
            <Message
              severity="info"
              text="Les changements de classe et réinscriptions restent conservés dans l’historique annuel."
            />
          </TabPanel>

          <TabPanel header="Assiduité" leftIcon="pi pi-calendar mr-2">
            <Message
              severity="info"
              text="Aucune absence enregistrée pour cette année."
            />
          </TabPanel>

          <TabPanel header="Notes et bulletins" leftIcon="pi pi-chart-bar mr-2">
            <Message
              severity="info"
              text="Les résultats seront disponibles après ouverture du module Notes."
            />
          </TabPanel>

          <TabPanel header="Documents" leftIcon="pi pi-file mr-2">
            {enrollment ? (
              <StudentDocumentsPanel
                institutionId={institutionId}
                studentId={student.id}
                enrollmentId={enrollment.id}
              />
            ) : (
              <Message
                severity="info"
                text="Aucune inscription pour cette année."
              />
            )}
          </TabPanel>

          <TabPanel header="Finances" leftIcon="pi pi-wallet mr-2">
            <Message
              severity="info"
              text="Les frais d’inscription seront affichés dans le prochain lot Finance scolaire."
            />
          </TabPanel>
        </TabView>
      </div>

      <AddGuardianDialog
        visible={guardianDialog}
        institutionId={institutionId}
        studentId={student.id}
        onHide={() => setGuardianDialog(false)}
        onSaved={reload}
      />
    </section>
  );
}
