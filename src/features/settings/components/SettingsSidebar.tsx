import { NavLink } from "react-router-dom";

const availableSections = [
  { path: "etablissement", icon: "pi-building", label: "Établissement" },
  { path: "annees-scolaires", icon: "pi-calendar", label: "Années scolaires" },
  { path: "cycles-niveaux", icon: "pi-sitemap", label: "Cycles et niveaux" },
  { path: "matieres", icon: "pi-book", label: "Matières" },
  {
    path: "evaluations-formules",
    icon: "pi-percentage",
    label: "Évaluations et formules",
  },
  {
    path: "regles-financieres",
    icon: "pi-wallet",
    label: "Règles financières",
  },
  {
    path: "utilisateurs-roles",
    icon: "pi-users",
    label: "Utilisateurs et rôles",
  },
] as const;

export function SettingsSidebar() {
  return (
    <aside className="settings-sidebar" aria-label="Rubriques de paramétrage">
      <h2>Rubriques</h2>
      <nav>
        {availableSections.map((section) => (
          <NavLink key={section.path} to={`/parametrage/${section.path}`}>
            <i className={`pi ${section.icon}`} />
            <span>{section.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
