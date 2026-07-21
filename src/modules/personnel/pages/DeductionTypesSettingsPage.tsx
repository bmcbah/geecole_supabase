import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function DeductionTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="deduction_type"
      title="Types de retenue"
      description="Configurez les retenues et régularisations déductibles de la rémunération."
      addLabel="Ajouter un type de retenue"
      singularLabel="Type de retenue"
    />
  );
}
