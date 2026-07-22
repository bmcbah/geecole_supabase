export type NavigationLink = {
  type: "link";
  label: string;
  icon: string;
  to: string;
  moduleCode: string;
};

export type NavigationTitle = {
  type: "title";
  label: string;
};

export type NavigationDivider = {
  type: "divider";
};

export type NavigationEntry =
  NavigationLink | NavigationTitle | NavigationDivider;

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
      {
        type: "link",
        label: "Élèves",
        icon: "pi-users",
        to: "/scolarite/eleves",
        moduleCode: "schooling",
      },
      {
        type: "link",
        label: "Nouvelle inscription",
        icon: "pi-user-plus",
        to: "/scolarite/inscriptions/nouvelle",
        moduleCode: "schooling",
      },
      {
        type: "link",
        label: "Réinscriptions groupées",
        icon: "pi-refresh",
        to: "/scolarite/reinscriptions",
        moduleCode: "schooling",
      },
    ],
  },
  {
    label: "Notes & Bulletins",
    icon: "pi-chart-bar",
    match: "/notes-bulletins",
    items: [
      { type: "title", label: "Notes" },
      {
        type: "link",
        label: "Cahier des notes",
        icon: "pi-book",
        to: "/notes-bulletins/cahiers",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Rattrapages à compléter",
        icon: "pi-clock",
        to: "/notes-bulletins/resultats-reportes",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Appréciations",
        icon: "pi-comment",
        to: "/notes-bulletins/appreciations",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Contrôle des moyennes",
        icon: "pi-calculator",
        to: "/notes-bulletins/controle-moyennes",
        moduleCode: "notes",
      },
      { type: "divider" },
      { type: "title", label: "Bulletins" },
      {
        type: "link",
        label: "Générations",
        icon: "pi-sparkles",
        to: "/notes-bulletins/generations",
        moduleCode: "bulletins",
      },
      {
        type: "link",
        label: "Bulletins",
        icon: "pi-file-pdf",
        to: "/notes-bulletins/bulletins",
        moduleCode: "bulletins",
      },
      {
        type: "link",
        label: "Validation",
        icon: "pi-verified",
        to: "/notes-bulletins/validation",
        moduleCode: "bulletins",
      },
      {
        type: "link",
        label: "Publication",
        icon: "pi-send",
        to: "/notes-bulletins/publication",
        moduleCode: "bulletins",
      },
      {
        type: "link",
        label: "Historique",
        icon: "pi-history",
        to: "/notes-bulletins/historique",
        moduleCode: "bulletins",
      },
      { type: "divider" },
      { type: "title", label: "Configuration" },
      {
        type: "link",
        label: "Gestion des périodes",
        icon: "pi-calendar-clock",
        to: "/notes-bulletins/periodes",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Affectations pédagogiques",
        icon: "pi-users",
        to: "/notes-bulletins/configuration/affectations",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Responsables de cycle",
        icon: "pi-sitemap",
        to: "/notes-bulletins/configuration/responsables-cycles",
        moduleCode: "notes",
      },
    ],
  },
  {
    label: "Personnel",
    icon: "pi-id-card",
    match: "/personnel",
    items: [
      { type: "title", label: "Pilotage" },
      {
        type: "link",
        label: "Vue d’ensemble",
        icon: "pi-chart-bar",
        to: "/personnel",
        moduleCode: "personnel",
      },
      { type: "divider" },
      { type: "title", label: "Dossiers" },
      {
        type: "link",
        label: "Employés",
        icon: "pi-users",
        to: "/personnel/employes",
        moduleCode: "personnel",
      },
      { type: "divider" },
      { type: "title", label: "Gestion RH" },
      {
        type: "link",
        label: "Présences et heures",
        icon: "pi-clock",
        to: "/personnel/heures",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Congés et absences",
        icon: "pi-calendar-minus",
        to: "/personnel/conges",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Avances",
        icon: "pi-wallet",
        to: "/personnel/avances",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Sanctions",
        icon: "pi-exclamation-triangle",
        to: "/personnel/sanctions",
        moduleCode: "personnel",
      },
      { type: "divider" },
      { type: "title", label: "Rémunération" },
      {
        type: "link",
        label: "Paie",
        icon: "pi-money-bill",
        to: "/personnel/paie",
        moduleCode: "personnel",
      },
    ],
  },
  {
    label: "Gestion financière",
    icon: "pi-wallet",
    match: "/gestion-financiere",
    items: [
      { type: "title", label: "Opérations" },
      {
        type: "link",
        label: "Dossiers financiers",
        icon: "pi-folder",
        to: "/gestion-financiere/dossiers",
        moduleCode: "finance",
      },
      {
        type: "link",
        label: "Historique des encaissements",
        icon: "pi-history",
        to: "/gestion-financiere/encaissements",
        moduleCode: "finance",
      },
      { type: "divider" },
      { type: "title", label: "Configuration" },
      {
        type: "link",
        label: "Grille tarifaire",
        icon: "pi-money-bill",
        to: "/gestion-financiere/configuration/grilles-tarifaires",
        moduleCode: "finance",
      },
      {
        type: "link",
        label: "Plans de paiement",
        icon: "pi-calendar-clock",
        to: "/gestion-financiere/configuration/plans-paiement",
        moduleCode: "finance",
      },
      {
        type: "link",
        label: "Modèles d’avantages",
        icon: "pi-percentage",
        to: "/gestion-financiere/configuration/modeles-avantages",
        moduleCode: "finance",
      },
    ],
  },
  {
    label: "Paramétrage",
    icon: "pi-cog",
    match: "/parametrage",
    items: [
      { type: "title", label: "Établissement" },
      {
        type: "link",
        label: "Général",
        icon: "pi-cog",
        to: "/parametrage/etablissement",
        moduleCode: "settings",
      },
      {
        type: "link",
        label: "Modules",
        icon: "pi-th-large",
        to: "/parametrage/modules",
        moduleCode: "settings",
      },
      {
        type: "link",
        label: "Années scolaires",
        icon: "pi-calendar",
        to: "/parametrage/annees-scolaires",
        moduleCode: "settings",
      },
      {
        type: "link",
        label: "Personnes et accès",
        icon: "pi-users",
        to: "/parametrage/utilisateurs-roles",
        moduleCode: "settings",
      },
      { type: "divider" },
      { type: "title", label: "Personnel" },
      {
        type: "link",
        label: "Fonctions",
        icon: "pi-briefcase",
        to: "/parametrage/personnel/fonctions",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types de contrat",
        icon: "pi-file",
        to: "/parametrage/personnel/contrats",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types d’activité",
        icon: "pi-clock",
        to: "/parametrage/personnel/activites",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types de prime",
        icon: "pi-plus-circle",
        to: "/parametrage/personnel/primes",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types de retenue",
        icon: "pi-minus-circle",
        to: "/parametrage/personnel/retenues",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types d’avance",
        icon: "pi-wallet",
        to: "/parametrage/personnel/avances",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Congés et absences",
        icon: "pi-calendar",
        to: "/parametrage/personnel/conges",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types de sanction",
        icon: "pi-exclamation-triangle",
        to: "/parametrage/personnel/sanctions",
        moduleCode: "personnel",
      },
      {
        type: "link",
        label: "Types de documents",
        icon: "pi-file",
        to: "/parametrage/personnel/documents",
        moduleCode: "personnel",
      },
      { type: "divider" },
      { type: "title", label: "Organisation scolaire" },
      {
        type: "link",
        label: "Cycles",
        icon: "pi-sitemap",
        to: "/parametrage/cycles",
        moduleCode: "schooling",
      },
      {
        type: "link",
        label: "Niveaux",
        icon: "pi-list",
        to: "/parametrage/niveaux",
        moduleCode: "schooling",
      },
      {
        type: "link",
        label: "Classes",
        icon: "pi-users",
        to: "/parametrage/classes",
        moduleCode: "schooling",
      },
      {
        type: "link",
        label: "Matières",
        icon: "pi-book",
        to: "/parametrage/matieres",
        moduleCode: "schooling",
      },
      { type: "divider" },
      { type: "title", label: "Évaluation" },
      {
        type: "link",
        label: "Types de notes",
        icon: "pi-tags",
        to: "/parametrage/types-notes",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Formules de calcul",
        icon: "pi-percentage",
        to: "/parametrage/formules-calcul",
        moduleCode: "notes",
      },
      {
        type: "link",
        label: "Paramètres pédagogiques",
        icon: "pi-sliders-h",
        to: "/parametrage/parametres-pedagogiques",
        moduleCode: "notes",
      },
      { type: "divider" },
      { type: "title", label: "Référentiels financiers" },
      {
        type: "link",
        label: "Catégories de frais",
        icon: "pi-tags",
        to: "/parametrage/categories-frais",
        moduleCode: "finance",
      },
    ],
  },
];

export const getNavigationLinks = (group: NavigationGroup): NavigationLink[] =>
  group.items?.filter((item): item is NavigationLink => item.type === "link") ??
  [];

function filterNavigationEntries(
  entries: NavigationEntry[],
  enabledModules: Set<string>,
) {
  const filtered: NavigationEntry[] = [];
  let pending: NavigationEntry[] = [];

  for (const entry of entries) {
    if (entry.type !== "link") {
      pending.push(entry);
      continue;
    }
    if (!enabledModules.has(entry.moduleCode)) continue;
    while (pending[0]?.type === "divider" && filtered.length === 0)
      pending = pending.slice(1);
    if (filtered.at(-1)?.type === "divider" && pending[0]?.type === "divider")
      pending = pending.slice(1);
    filtered.push(...pending, entry);
    pending = [];
  }

  while (filtered.at(-1)?.type === "divider") filtered.pop();
  return filtered;
}

export function filterNavigationByModules(
  groups: NavigationGroup[],
  enabledModuleCodes: string[] | null,
) {
  if (enabledModuleCodes === null) return groups;
  const enabledModules = new Set(enabledModuleCodes);
  return groups
    .map((group) => ({
      ...group,
      items: filterNavigationEntries(group.items ?? [], enabledModules),
    }))
    .filter((group) => getNavigationLinks(group).length > 0);
}
