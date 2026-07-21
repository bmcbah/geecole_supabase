import { PersonnelCatalogSettings } from "../components/PersonnelCatalogSettings";
export function PersonnelFunctionsSettingsPage() {
  return (
    <PersonnelCatalogSettings
      category="function"
      title="Fonctions du personnel"
      description="Définissez les fonctions utilisées pour les affectations et les dossiers du personnel."
      addLabel="Ajouter une fonction"
      singularLabel="Fonction"
    />
  );
}
