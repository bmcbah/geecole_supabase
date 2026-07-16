import { NavLink } from "react-router-dom";
const groups = [
  {
    label: "Général",
    sections: [
      { path: "etablissement", icon: "pi-building", label: "Établissement" },
      {
        path: "annees-scolaires",
        icon: "pi-calendar",
        label: "Années scolaires",
      },
      {
        path: "utilisateurs-roles",
        icon: "pi-users",
        label: "Personnes et accès",
      },
    ],
  },
  {
    label: "Pédagogie",
    sections: [
      {
        path: "cycles-niveaux",
        icon: "pi-sitemap",
        label: "Cycles et niveaux",
      },
      { path: "matieres", icon: "pi-book", label: "Matières" },
    ],
  },
  {
    label: "Évaluation",
    sections: [
      {
        path: "evaluations-formules",
        icon: "pi-percentage",
        label: "Types et formules",
      },
    ],
  },
  {
    label: "Finances",
    sections: [
      {
        path: "regles-financieres",
        icon: "pi-wallet",
        label: "Frais et règles",
      },
    ],
  },
] as const;
export function SettingsSidebar() {
  return (
    <aside className="settings-sidebar" aria-label="Rubriques de paramétrage">
      <h2>Rubriques</h2>
      {groups.map((group) => (
        <div className="settings-nav-group" key={group.label}>
          <span className="settings-group-title">{group.label}</span>
          <nav>
            {group.sections.map((section) => (
              <NavLink key={section.path} to={`/parametrage/${section.path}`}>
                <i className={`pi ${section.icon}`} />
                <span>{section.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}
