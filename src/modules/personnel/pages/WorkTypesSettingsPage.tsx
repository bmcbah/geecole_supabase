import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function WorkTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="work_type"
      title="Types d’activité"
      description="Configurez les activités et heures pouvant être saisies et validées."
      addLabel="Ajouter un type d’activité"
      singularLabel="Type d’activité"
    />
  );
}
