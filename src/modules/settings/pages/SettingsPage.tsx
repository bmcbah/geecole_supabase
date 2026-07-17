import { Navigate, useParams } from "react-router-dom";
import { Accordion, AccordionTab } from "primereact/accordion";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { PageHeader } from "../../../shared/components/layout/PageHeader";
import { InstitutionDetailsForm } from "../components/InstitutionDetailsForm";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { CyclesSettingsPanel } from "../components/CyclesSettingsPanel";
import { SubjectsSettingsPanel } from "../components/SubjectsSettingsPanel";
import { AcademicYearsPanel } from "../../settings/components/AcademicYearsPanel";
import { LevelsSettingsPanel } from "../../settings/components/LevelsSettingsPanel";
import { FinancialRulesSettingsPanel } from "../../settings/components/FinancialRulesSettingsPanel";
import { PeopleAccessPanel } from "../../settings/components/PeopleAccessPanel";
import { EvaluationSettingsPage } from "../../settings/pages/EvaluationSettingsPage";
import { EnrollmentPolicyPanel } from "../../schooling/components/EnrollmentPolicyPanel";
import { ReenrollmentPolicyPanel } from "../../schooling/components/ReenrollmentPolicyPanel";
import { DocumentRequirementsPanel } from "../../schooling/components/DocumentRequirementsPanel";
import { ClassOrganizationCard } from "../../schooling/components/ClassOrganizationCard";
import { ClassesPage } from "../../schooling/pages/ClassesPage";

const sections = [
  "etablissement",
  "annees-scolaires",
  "cycles",
  "niveaux",
  "classes",
  "matieres",
  "evaluations-formules",
  "regles-financieres",
  "utilisateurs-roles",
] as const;

export function SettingsPage() {
  const { section } = useParams<{ section?: string }>();
  const {
    institution: selected,
    year,
    loading,
    failure,
    refresh,
  } = useAcademicSession();

  if (loading) {
    return (
      <div className="content-state">
        <ProgressSpinner />
      </div>
    );
  }

  if (failure) return <Message severity="error" text={failure} />;

  if (!selected) {
    return (
      <Message
        severity="warn"
        text="Aucun établissement n’est associé à votre compte."
      />
    );
  }

  if (!section) return <Navigate to="/parametrage/etablissement" replace />;

  if (!sections.includes(section as (typeof sections)[number])) {
    return <Navigate to="/parametrage/etablissement" replace />;
  }

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
            <div className="space-y-3">
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Informations générales
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Identité, coordonnées et préférences utilisées dans toute
                    l’application.
                  </p>
                </div>
                <div className="p-3">
                  <InstitutionDetailsForm
                    institution={selected}
                    onUpdated={() => void refresh()}
                  />
                </div>
              </section>

              <section>
                <div className="mb-2 px-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Options avancées
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ouvrez uniquement la rubrique que vous souhaitez modifier.
                  </p>
                </div>
                <Accordion className="[&_.p-accordion-content]:p-3 [&_.p-accordion-header-link]:px-3 [&_.p-accordion-header-link]:py-2.5 [&_.p-accordion-header-text]:text-sm [&_.p-accordion-tab]:mb-1.5">
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
              </section>
            </div>
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
            <EvaluationSettingsPage />
          ) : section === "regles-financieres" ? (
            <FinancialRulesSettingsPanel />
          ) : (
            <PeopleAccessPanel />
          )}
        </div>
      </div>
    </section>
  );
}
