export type NavigationLink = {
  type: "link";
  label: string;
  icon: string;
  to: string;
};

export type NavigationTitle = {
  type: "title";
  label: string;
};

export type NavigationDivider = {
  type: "divider";
};

export type NavigationEntry = NavigationLink | NavigationTitle | NavigationDivider;

export type NavigationGroup = {
  label: string;
  icon: string;
  match: string;
  to?: string;
  items?: NavigationEntry[];
};

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
    label: "Gestion financière",
    icon: "pi-wallet",
    match: "/gestion-financiere",
    items: [
      { type: "title", label: "Opérations" },
      { type: "link", label: "Dossiers financiers", icon: "pi-folder", to: "/gestion-financiere/dossiers" },
      { type: "divider" },
      { type: "title", label: "Configuration" },
      { type: "link", label: "Frais de scolarité", icon: "pi-money-bill", to: "/parametrage/regles-financieres" },
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
      { type: "title", label: "Évaluation et finances" },
      { type: "link", label: "Types de notes", icon: "pi-tags", to: "/parametrage/types-notes" },
      { type: "link", label: "Formules de calcul", icon: "pi-percentage", to: "/parametrage/formules-calcul" },
      { type: "link", label: "Frais et règles", icon: "pi-wallet", to: "/parametrage/regles-financieres" },
    ],
  },
];

export const getNavigationLinks = (group: NavigationGroup): NavigationLink[] =>
  group.items?.filter((item): item is NavigationLink => item.type === "link") ?? [];