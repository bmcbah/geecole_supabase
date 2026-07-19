export type NavigationLink = { type: "link"; label: string; icon: string; to: string };
export type NavigationTitle = { type: "title"; label: string };
export type NavigationDivider = { type: "divider" };
export type NavigationEntry = NavigationLink | NavigationTitle | NavigationDivider;
export type NavigationGroup = { label: string; icon: string; match: string; to?: string; items?: NavigationEntry[] };

export const navigation: NavigationGroup[] = [
  {
    label: "Scolarité",
    icon: "pi-graduation-cap",
    match: "/scolarite",
    items: [
      { type: "link", label: "Élèves", icon: "pi-users", to: "/scolarite/eleves" },
      { type: "link", label: "Nouvelle inscription", icon: "pi-user-plus", to: "/scolarite/inscriptions/nouvelle" },
      { type: "link", label: "Réinscriptions groupées", icon: "pi-refresh", to: "/scolarite/reinscriptions" },
    ],
  },
  {
    label: "Notes et bulletins",
    icon: "pi-book",
    match: "/notes",
    items: [
      { type: "title", label: "Enseignement" },
      { type: "link", label: "Mes classes", icon: "pi-th-large", to: "/notes/mes-classes" },
      { type: "link", label: "Cahier de notes", icon: "pi-pencil", to: "/notes/cahier" },
      { type: "link", label: "Résultats de période", icon: "pi-calculator", to: "/notes/resultats" },
      { type: "divider" },
      { type: "title", label: "Organisation pédagogique" },
      { type: "link", label: "Enseignants", icon: "pi-id-card", to: "/notes/enseignants" },
      { type: "link", label: "Affectations pédagogiques", icon: "pi-sitemap", to: "/notes/affectations" },
      { type: "link", label: "Paramétrage du module", icon: "pi-cog", to: "/notes/parametrage" },
      { type: "divider" },
      { type: "title", label: "Conseil et publication" },
      { type: "link", label: "Délibérations", icon: "pi-verified", to: "/notes/deliberations" },
      { type: "link", label: "Bulletins", icon: "pi-file-pdf", to: "/notes/bulletins" },
    ],
  },
  {
    label: "Gestion financière",
    icon: "pi-wallet",
    match: "/gestion-financiere",
    items: [
      { type: "title", label: "Opérations" },
      { type: "link", label: "Dossiers financiers", icon: "pi-folder", to: "/gestion-financiere/dossiers" },
      { type: "link", label: "Historique des encaissements", icon: "pi-history", to: "/gestion-financiere/encaissements" },
      { type: "divider" },
      { type: "title", label: "Configuration" },
      { type: "link", label: "Grille tarifaire", icon: "pi-money-bill", to: "/gestion-financiere/configuration/grilles-tarifaires" },
      { type: "link", label: "Plans de paiement", icon: "pi-calendar-clock", to: "/gestion-financiere/configuration/plans-paiement" },
      { type: "link", label: "Modèles d’avantages", icon: "pi-percentage", to: "/gestion-financiere/configuration/modeles-avantages" },
    ],
  },
  {
    label: "Paramétrage",
    icon: "pi-cog",
    match: "/parametrage",
    items: [
      { type: "title", label: "Établissement" },
      { type: "link", label: "Général", icon: "pi-cog", to: "/parametrage/etablissement" },
      { type: "link", label: "Années scolaires", icon: "pi-calendar", to: "/parametrage/annees-scolaires" },
      { type: "link", label: "Personnes et accès", icon: "pi-users", to: "/parametrage/utilisateurs-roles" },
      { type: "divider" },
      { type: "title", label: "Organisation scolaire" },
      { type: "link", label: "Cycles", icon: "pi-sitemap", to: "/parametrage/cycles" },
      { type: "link", label: "Niveaux", icon: "pi-list", to: "/parametrage/niveaux" },
      { type: "link", label: "Classes", icon: "pi-users", to: "/parametrage/classes" },
      { type: "link", label: "Matières", icon: "pi-book", to: "/parametrage/matieres" },
      { type: "divider" },
      { type: "title", label: "Évaluation" },
      { type: "link", label: "Types d’évaluation", icon: "pi-tags", to: "/parametrage/types-notes" },
      { type: "link", label: "Formules de calcul", icon: "pi-percentage", to: "/parametrage/formules-calcul" },
      { type: "divider" },
      { type: "title", label: "Référentiels financiers" },
      { type: "link", label: "Catégories de frais", icon: "pi-tags", to: "/parametrage/categories-frais" },
    ],
  },
];

export const getNavigationLinks = (group: NavigationGroup): NavigationLink[] =>
  group.items?.filter((item): item is NavigationLink => item.type === "link") ?? [];
