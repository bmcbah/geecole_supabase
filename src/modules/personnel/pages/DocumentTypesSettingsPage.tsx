import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function DocumentTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="document_type"
      title="Types de documents"
      description="Configurez les pièces administratives pouvant être déposées dans les dossiers du personnel."
      addLabel="Ajouter un type de document"
      singularLabel="Type de document"
    />
  );
}
