import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
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
import {
  getStudent,
  removeStudentGuardian,
  type StudentGuardian,
} from "../services/schooling.service";

type StudentDetail = Awaited<ReturnType<typeof getStudent>>;
const infoCardClass = "rounded-xl border border-slate-200 bg-white p-4";
const relationshipLabels: Record<string, string> = {
  father: "Père",
  mother: "Mère",
  guardian: "Tuteur / Tutrice",
  other: "Autre",
};

export function StudentProfilePage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const { yearId, year, institutionId } = useAcademicSession();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [failure, setFailure] = useState("");
  const [guardianDialog, setGuardianDialog] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState<StudentGuardian | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const reload = async () => {
    if (!studentId || !yearId) return;
    setDetail(await getStudent(studentId, yearId));
  };

  useEffect(() => {
    void reload().catch(() => setFailure("Impossible de charger la fiche élève."));
  }, [studentId, yearId]);

  const openAddGuardian = () => {
    setEditingGuardian(null);
    setGuardianDialog(true);
  };

  const openEditGuardian = (guardian: StudentGuardian) => {
    setEditingGuardian(guardian);
    setGuardianDialog(true);
  };

  const removeGuardian = (guardian: StudentGuardian) => {
    confirmDialog({
      header: "Retirer le responsable",
      message: `Retirer ${guardian.first_name} ${guardian.last_name} de cette fiche élève ?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Retirer",
      rejectLabel: "Annuler",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await removeStudentGuardian(studentId, guardian.id);
          await reload();
        } catch (error) {
          setFailure(
            error instanceof Error
              ? error.message
              : "Impossible de retirer ce responsable.",
          );
        }
      },
    });
  };

  if (failure && !detail) return <Message severity="error" text={failure} />;
  if (!detail) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <ProgressSpinner />
      </div>
    );
  }

  const { student, enrollment, guardians } = detail;
  const primaryGuardian = guardians.find((guardian) => guardian.is_primary_contact);

  return (
    <SchoolingPanel
      path={`Scolarité · Élèves · ${year?.name ?? "Année scolaire"}`}
      title={`${student.first_name} ${student.last_name}`}
      description={
        enrollment
          ? `${student.matricule} · ${enrollment.cycle_name_snapshot} · ${enrollment.level_name_snapshot}`
          : `${student.matricule} · Aucune inscription active`
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
      backLabel="Retour aux élèves"
      onBack={() => void navigate("/scolarite/eleves")}
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
    >
      <ConfirmDialog />
      <div className="space-y-4">
        {failure ? <Message severity="error" text={failure} /> : null}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {student.first_name} {student.last_name}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                    {student.matricule}
                  </span>
                  <span>{year?.name ?? "Année non définie"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-600">Responsables</span>
                <strong className="mt-1 block text-base text-slate-900">{guardians.length}</strong>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-600">Niveau</span>
                <strong className="mt-1 block truncate text-sm text-slate-900">{enrollment?.level_name_snapshot || "—"}</strong>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <span className="block text-[11px] uppercase tracking-wide text-emerald-600">Année</span>
                <strong className="mt-1 block truncate text-sm text-slate-900">{year?.name || "—"}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <TabView activeIndex={activeTab} onTabChange={(event) => setActiveTab(event.index)}>
            <TabPanel header="Vue d’ensemble" leftIcon="pi pi-home mr-2">
              <div className="grid gap-4 xl:grid-cols-3">
                <section className={infoCardClass}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Identité</h3>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-slate-500">Date de naissance</dt><dd className="font-medium text-slate-900">{student.birth_date || "Non renseignée"}</dd></div>
                    <div><dt className="text-slate-500">Lieu de naissance</dt><dd className="font-medium text-slate-900">{student.birth_place || "Non renseigné"}</dd></div>
                    <div><dt className="text-slate-500">Adresse</dt><dd className="font-medium text-slate-900">{student.address || "Non renseignée"}</dd></div>
                  </dl>
                </section>
                <section className={infoCardClass}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-900">Responsable principal</h3>
                    <Button icon="pi pi-user-plus" text rounded size="small" aria-label="Ajouter un responsable" onClick={openAddGuardian} />
                  </div>
                  {primaryGuardian ? (
                    <div className="rounded-lg bg-slate-50 p-4">
                      <strong className="block text-sm text-slate-900">{primaryGuardian.first_name} {primaryGuardian.last_name}</strong>
                      <span className="mt-2 block text-sm text-slate-600"><i className="pi pi-phone mr-2 text-emerald-500" />{primaryGuardian.primary_phone || "Téléphone non renseigné"}</span>
                    </div>
                  ) : <Message severity="warn" text="Aucun responsable principal" />}
                </section>
                <section className={infoCardClass}>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Scolarité</h3>
                  <div className="space-y-2 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Cycle</span><strong>{enrollment?.cycle_name_snapshot || "—"}</strong></div>
                    <div className="rounded-lg bg-slate-50 p-3"><span className="block text-xs text-slate-500">Niveau</span><strong>{enrollment?.level_name_snapshot || "—"}</strong></div>
                  </div>
                </section>
              </div>
            </TabPanel>

            <TabPanel header="Responsables" leftIcon="pi pi-users mr-2">
              <div className="mb-4 flex justify-end">
                <Button label="Ajouter un responsable" icon="pi pi-user-plus" size="small" onClick={openAddGuardian} />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {guardians.map((guardian) => (
                  <article className={infoCardClass} key={guardian.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm text-slate-900">{guardian.first_name} {guardian.last_name}</strong>
                        <span className="mt-1 block text-xs text-slate-500">{relationshipLabels[guardian.relationship] ?? guardian.relationship}</span>
                      </div>
                      {guardian.is_primary_contact ? <Tag value="Principal" severity="success" /> : null}
                    </div>
                    <span className="mt-3 block text-sm text-slate-600"><i className="pi pi-phone mr-2 text-emerald-500" />{guardian.primary_phone || "Non renseigné"}</span>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guardian.is_financial_responsible ? <Tag value="Financier" severity="info" /> : null}
                      {guardian.is_emergency_contact ? <Tag value="Urgence" severity="warning" /> : null}
                    </div>
                    <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                      <Button icon="pi pi-pencil" text rounded size="small" aria-label="Modifier" onClick={() => openEditGuardian(guardian)} />
                      <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Retirer" onClick={() => removeGuardian(guardian)} />
                    </div>
                  </article>
                ))}
              </div>
            </TabPanel>

            <TabPanel header="Parcours scolaire" leftIcon="pi pi-book mr-2">
              {enrollment ? <StudentClassAssignment enrollmentId={enrollment.id} yearId={yearId} annualLevelId={enrollment.academic_year_level_id} /> : <Message severity="info" text="Aucune inscription pour cette année." />}
            </TabPanel>
            <TabPanel header="Assiduité" leftIcon="pi pi-calendar mr-2"><Message severity="info" text="Aucune absence enregistrée pour cette année." /></TabPanel>
            <TabPanel header="Notes et bulletins" leftIcon="pi pi-chart-bar mr-2"><Message severity="info" text="Les résultats seront disponibles après ouverture du module Notes." /></TabPanel>
            <TabPanel header="Documents" leftIcon="pi pi-file mr-2">
              {enrollment ? <StudentDocumentsPanel institutionId={institutionId} studentId={student.id} enrollmentId={enrollment.id} /> : <Message severity="info" text="Aucune inscription pour cette année." />}
            </TabPanel>
            <TabPanel header="Finances" leftIcon="pi pi-wallet mr-2"><Message severity="info" text="Les frais d’inscription seront affichés dans le module financier." /></TabPanel>
          </TabView>
        </section>

        <AddGuardianDialog
          visible={guardianDialog}
          institutionId={institutionId}
          studentId={student.id}
          editing={editingGuardian}
          onHide={() => {
            setGuardianDialog(false);
            setEditingGuardian(null);
          }}
          onSaved={reload}
        />
      </div>
    </SchoolingPanel>
  );
}
