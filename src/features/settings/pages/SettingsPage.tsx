import { Navigate, useParams } from "react-router-dom";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
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
        text="Créez d’abord un établissement depuis la page Établissement."
      />
    );
  if (!section) return <Navigate to="/parametrage/etablissement" replace />;
  if (
    ![
      "etablissement",
      "annees-scolaires",
      "cycles",
      "niveaux",
      "matieres",
      "evaluations-formules",
      "regles-financieres",
      "utilisateurs-roles",
    ].includes(section)
  )
    return <Navigate to="/parametrage/etablissement" replace />;
  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Paramétrage</h1>
          <p>Configurez les règles propres à {selected.name}.</p>
        </div>
        {year && (
          <div className="settings-year-context">
            <small>Paramétrage affiché</small>
            <strong>{year.name}</strong>
          </div>
        )}
      </div>
      <div className="settings-layout">
        <SettingsSidebar />
        <div className="settings-content">
          {section === "etablissement" ? (
            <div className="institution-settings-stack medium-controls">
              <InstitutionDetailsForm
                institution={selected}
                onUpdated={() => void refresh()}
              />
              <EnrollmentPolicyPanel institutionId={selected.id} />
            </div>
          ) : section === "annees-scolaires" ? (
            <AcademicYearsPanel institutionId={selected.id} />
          ) : section === "cycles" ? (
            <CyclesSettingsPanel />
          ) : section === "niveaux" ? (
            <LevelsSettingsPanel institutionId={selected.id} />
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
