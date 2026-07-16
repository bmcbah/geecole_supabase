import { NavLink } from "react-router-dom";

const availableSections = [
  { path: "etablissement", icon: "pi-building", label: "Établissement" },
  { path: "annees-scolaires", icon: "pi-calendar", label: "Années scolaires" },
  { path: "cycles-niveaux", icon: "pi-sitemap", label: "Cycles et niveaux" },
] as const;

const plannedSections = [
  { icon: "pi-book", label: "Matières" },
  { icon: "pi-percentage", label: "Évaluations et formules" },
  { icon: "pi-wallet", label: "Règles financières" },
  { icon: "pi-users", label: "Utilisateurs et rôles" },
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
      <div className="settings-planned">
        <span className="settings-group-title">À configurer ensuite</span>
        {plannedSections.map((section) => (
          <div
            key={section.label}
            className="settings-disabled"
            aria-disabled="true"
          >
            <i className={`pi ${section.icon}`} />
            <span>{section.label}</span>
            <small>À venir</small>
          </div>
        ))}
      </div>
    </aside>
  );
}
