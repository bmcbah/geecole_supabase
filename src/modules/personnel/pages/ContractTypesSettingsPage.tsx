import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function ContractTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="contract_type"
      title="Types de contrat"
      description="Configurez les formes de contrat proposées lors de l’embauche."
      addLabel="Ajouter un type de contrat"
      singularLabel="Type de contrat"
    />
  );
}
