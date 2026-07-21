import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function BonusTypesSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="bonus_type"
      title="Types de prime"
      description="Configurez les gains complémentaires disponibles pendant le calcul de la paie."
      addLabel="Ajouter un type de prime"
      singularLabel="Type de prime"
    />
  );
}
