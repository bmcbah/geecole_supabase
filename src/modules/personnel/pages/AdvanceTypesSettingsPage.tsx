import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function AdvanceTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="advance_type"
      title="Types d’avance"
      description="Configurez les avances et aides accordées au personnel."
      addLabel="Ajouter un type d’avance"
      singularLabel="Type d’avance"
    />
  );
}
