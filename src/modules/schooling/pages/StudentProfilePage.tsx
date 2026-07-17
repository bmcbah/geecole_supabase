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
import { getStudent } from "../services/schooling.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;
export function StudentProfilePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId, year, institutionId } = useAcademicSession();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [failure, setFailure] = useState("");
  const [guardianDialog, setGuardianDialog] = useState(false);
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
    <section className="student-profile-page medium-controls">
      <Button
        label="Retour aux élèves"
        icon="pi pi-arrow-left"
        text
        onClick={() => void navigate("/scolarite/eleves")}
      />
      <header className="student-profile-header">
        <div className="student-profile-main">
          <span className="student-avatar student-avatar-large">
            {student.first_name[0]}
            {student.last_name[0]}
          </span>
          <div>
            <span className="eyebrow">{student.matricule}</span>
            <h1>
              {student.first_name} {student.last_name}
            </h1>
            <p>
              {enrollment
                ? `${enrollment.cycle_name_snapshot} · ${enrollment.level_name_snapshot} · ${year?.name}`
                : "Aucune inscription pour cette année"}
            </p>
          </div>
        </div>
        <div className="student-profile-header-actions">
          {enrollment && (
            <EnrollmentStatusTag
              status={
                enrollment.status as Parameters<
                  typeof EnrollmentStatusTag
                >[0]["status"]
              }
            />
          )}
          {enrollment?.status === "confirmed" && (
            <Button
              label="Réinscrire"
              icon="pi pi-refresh"
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
      </header>
      <TabView className="student-profile-tabs">
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
          <Message
            severity="info"
            text="L’historique annuel sera enrichi dans le lot Réinscription."
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
        <TabPanel header="Documents" leftIcon="pi pi-folder mr-2">
          <Message severity="info" text="Aucun document ajouté." />
        </TabPanel>
      </TabView>
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
