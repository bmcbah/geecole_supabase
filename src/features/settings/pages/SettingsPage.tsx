import { Navigate, useParams } from "react-router-dom";
import { Message } from "primereact/message";
import { ProgressSpinner } from "primereact/progressspinner";
import { useAcademicSession } from "../../academic-session/components/academic-session-context";
import { AcademicYearsPanel } from "../components/AcademicYearsPanel";
import { InstitutionDetailsForm } from "../components/InstitutionDetailsForm";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { AcademicStructurePanel } from "../components/AcademicStructurePanel";
import { SubjectsSettingsPanel } from "../components/SubjectsSettingsPanel";
import { EvaluationSettingsPanel } from "../components/EvaluationSettingsPanel";
import { FinancialRulesSettingsPanel } from "../components/FinancialRulesSettingsPanel";
import { UsersSettingsPanel } from "../components/UsersSettingsPanel";
import { PeriodsSettingsPanel } from "../components/PeriodsSettingsPanel";

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
      "cycles-niveaux",
      "matieres",
      "periodes",
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
            <InstitutionDetailsForm
              institution={selected}
              onUpdated={() => void refresh()}
            />
          ) : section === "annees-scolaires" ? (
            <AcademicYearsPanel institutionId={selected.id} />
          ) : section === "cycles-niveaux" ? (
            <AcademicStructurePanel institutionId={selected.id} />
          ) : section === "matieres" ? (
            <SubjectsSettingsPanel />
          ) : section === "periodes" ? (
            <PeriodsSettingsPanel />
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
