import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function LeaveTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="leave_type"
      title="Types de congé et d’absence"
      description="Configurez les motifs proposés dans les demandes et les absences."
      addLabel="Ajouter un type de congé"
      singularLabel="Type de congé"
    />
  );
}
