import { NavLink } from "react-router-dom";

const groups = [
  {
    label: "Administration",
    sections: [
      { path: "etablissement", icon: "pi-cog", label: "Général" },
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
      { path: "cycles", icon: "pi-sitemap", label: "Cycles" },
      { path: "niveaux", icon: "pi-list", label: "Niveaux" },
      { path: "classes", icon: "pi-users", label: "Classes" },
      { path: "matieres", icon: "pi-book", label: "Matières" },
    ],
  },
  {
    label: "Évaluation",
    sections: [
      {
        path: "types-notes",
        icon: "pi-tags",
        label: "Types de notes",
      },
      {
        path: "formules-calcul",
        icon: "pi-percentage",
        label: "Formules de calcul",
      },
    ],
  },
  {
    label: "Frais scolaires",
    sections: [
      {
        path: "grilles-tarifaires",
        icon: "pi-wallet",
        label: "Catalogue et tarifs",
      },
      {
        path: "plans-paiement",
        icon: "pi-calendar-clock",
        label: "Plans de paiement",
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