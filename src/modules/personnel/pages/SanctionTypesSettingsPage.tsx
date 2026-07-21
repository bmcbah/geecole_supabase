import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function SanctionTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="sanction_type"
      title="Types de sanction"
      description="Configurez les sanctions administratives disponibles dans les dossiers du personnel."
      addLabel="Ajouter un type de sanction"
      singularLabel="Type de sanction"
    />
  );
}
