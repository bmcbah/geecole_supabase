import { Navigate, useParams } from "react-router-dom";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { AcademicYearsPanel } from "../components/AcademicYearsPanel";
import { InstitutionDetailsForm } from "../components/InstitutionDetailsForm";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { LevelsSettingsPanel } from "../components/AcademicStructurePanel";
import { CyclesSettingsPanel } from "../components/CyclesSettingsPanel";
import { SubjectsSettingsPanel } from "../components/SubjectsSettingsPanel";
import { EvaluationSettingsPanel } from "../components/EvaluationSettingsPanel";
import { FinancialRulesSettingsPanel } from "../components/FinancialRulesSettingsPanel";
import { UsersSettingsPanel } from "../components/UsersSettingsPanel";
import { EnrollmentPolicyPanel } from "../../../modules/schooling/components/EnrollmentPolicyPanel";
import { ReenrollmentPolicyPanel } from "../../../modules/schooling/components/ReenrollmentPolicyPanel";
import { DocumentRequirementsPanel } from "../../../modules/schooling/components/DocumentRequirementsPanel";
import { ClassOrganizationCard } from "../../../modules/schooling/components/ClassOrganizationCard";
import { ClassesPage } from "../../../modules/schooling/pages/ClassesPage";

export function SettingsPage() {
  const { section } = useParams<{ section?: string }>();
  const {
    institution: selected,
    year,
    loading,
    failure,
    refresh,
  } = useAcademicSession();

  if (loading)
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );

  if (failure) return <Message severity="error" text={failure} />;

  if (!selected)
    return (
      <Message
        severity="warn"
        text="Aucun établissement n’est associé à votre compte."
      />
    );

  if (!section) return <Navigate to="/parametrage/etablissement" replace />;

  if (
    ![
      "etablissement",
      "annees-scolaires",
      "cycles",
      "niveaux",
      "classes",
      "matieres",
      "evaluations-formules",
      "regles-financieres",
      "utilisateurs-roles",
    ].includes(section)
  )
    return <Navigate to="/parametrage/etablissement" replace />;

  return (
    <section className="space-y-3">
      <PageHeader
        eyebrow="Administration"
        title="Paramétrage"
        description={`Configurez les règles propres à ${selected.name}.`}
        meta={
          year ? (
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
              {year.name}
            </span>
          ) : undefined
        }
      />

      <div className="settings-layout">
        <SettingsSidebar />
        <div className="settings-content">
          {section === "etablissement" ? (
            <Accordion activeIndex={0} className="compact-settings-accordion">
              <AccordionTab header="Informations générales">
                <InstitutionDetailsForm
                  institution={selected}
                  onUpdated={() => void refresh()}
                />
              </AccordionTab>
              <AccordionTab header="Règles d’inscription">
                <EnrollmentPolicyPanel institutionId={selected.id} />
              </AccordionTab>
              <AccordionTab header="Règles de réinscription">
                <ReenrollmentPolicyPanel institutionId={selected.id} />
              </AccordionTab>
              <AccordionTab header="Documents requis">
                <DocumentRequirementsPanel institutionId={selected.id} />
              </AccordionTab>
              <AccordionTab header="Organisation des classes">
                <ClassOrganizationCard
                  institution={selected}
                  onSaved={refresh}
                />
              </AccordionTab>
            </Accordion>
          ) : section === "annees-scolaires" ? (
            <AcademicYearsPanel institutionId={selected.id} />
          ) : section === "cycles" ? (
            <CyclesSettingsPanel />
          ) : section === "niveaux" ? (
            <LevelsSettingsPanel institutionId={selected.id} />
          ) : section === "classes" ? (
            <ClassesPage />
          ) : section === "matieres" ? (
            <SubjectsSettingsPanel />
          ) : section === "evaluations-formules" ? (
            <EvaluationSettingsPanel />
          ) : section === "regles-financieres" ? (
            <FinancialRulesSettingsPanel />
          ) : (
            <UsersSettingsPanel />
          )}
        </div>
      </div>
    </section>
  );
}
