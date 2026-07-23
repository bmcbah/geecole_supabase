# Design System GeeCole

> **Statut : décision consolidée**  
> Ce document rassemble les décisions UX validées en juillet 2026.

## Principes

GeeCole privilégie, dans cet ordre :

1. la facilité d’apprentissage ;
2. la rapidité d’exécution ;
3. la richesse fonctionnelle ;
4. l’esthétique.

L’interface doit être moderne, métier, relativement dense et cohérente. Elle ne doit ni copier un ERP lourd, ni multiplier les cartes décoratives, ni disperser les actions.

## Documents associés

- [Responsive](responsive.md)
- [Accessibilité](accessibility.md)
- [Performances](performance.md)
- [États d’interface et qualité](states-and-quality.md)

## Grammaire de navigation

La profondeur maximale est :

`Application → Module → Fonctionnalité → Workspace`

- Un module représente un grand domaine : Scolarité, Notes, Finances, Personnel, Agenda, Paramétrage.
- Une fonctionnalité représente un concept métier.
- Un workspace est une page de travail autonome regroupant l’essentiel d’une tâche métier.
- Une action complexe peut ouvrir un workspace dédié ou un assistant, mais ne doit pas créer une navigation profonde.

## Workspaces officiels

GeeCole utilise cinq modèles :

- **Workspace Liste** : header, filtres compacts, table, actions de masse, pagination.
- **Workspace Fiche** : header d’entité, onglets métier, contenu et, lorsque nécessaire, cards de synthèse ou composants métier.
- **Workspace Rapport** : paramètres, prévisualisation, génération, historique.
- **Workspace Assistant** : étapes ordonnées, formulaire, résumé, validation.
- **Workspace Dashboard** : KPI, activité, tâches, calendrier et raccourcis adaptés au rôle.

Une page de travail doit permettre d’accomplir environ 95 % d’une tâche métier sans quitter la fonctionnalité.

## Header et actions

Le header n’est jamais placé dans une card.

- À gauche : titre et description.
- À droite : au maximum trois actions visibles.
- Une seule action primaire.
- Les autres actions sont regroupées dans `Actions` ou `⋮`.
- Les actions dangereuses ne sont pas placées directement dans les formulaires.

Les actions globales sont dans le header. Les actions d’un onglet sont placées dans cet onglet. Les actions de masse apparaissent au-dessus de la table lorsque des lignes sont sélectionnées.

## Règle d’or : structure standard d’un workspace

Chaque workspace GeeCole respecte la même hiérarchie visuelle afin de garantir une expérience cohérente, lisible et prévisible dans toute l’application.

### HeaderPage

Le `HeaderPage` contient :

- le titre ;
- la description ;
- les actions principales ;
- les éventuels onglets de navigation du workspace.

Lorsqu’un workspace possède des onglets de navigation, ils sont intégrés dans le `HeaderPage`, immédiatement sous le titre et les actions, sur sa `border-bottom`.

Les onglets ne doivent jamais être placés sous les filtres, dans une card ou dans le contenu principal.

### Toolbar

La toolbar est toujours affichée sur une seule ligne horizontale sur desktop.

Elle peut contenir :

- la recherche ;
- les filtres rapides ;
- les actions rapides ;
- les actions de masse ;
- l’export ;
- les commandes secondaires regroupées.

Aucun retour à la ligne n’est autorisé sur desktop. Lorsque l’espace devient insuffisant, il faut réduire les contrôles secondaires ou les regrouper dans un menu `Plus` ou `Actions`, sans casser la toolbar sur plusieurs lignes.

### Zone de filtres

Les filtres avancés sont placés sous la toolbar, dans une zone dédiée.

Ils sont organisés en colonnes afin d’optimiser l’espace vertical, la lisibilité et la comparaison des critères.

Les filtres avancés ne doivent pas être mélangés avec les actions principales de la toolbar.

### Contenu principal

Le contenu principal commence immédiatement sous la zone de filtres. Il peut contenir une `DataTable`, un `TreeView`, un dashboard, un rapport ou tout autre composant métier adapté au workspace.

La pagination et les informations de synthèse sont placées dans le pied du contenu lorsqu’elles sont nécessaires.

### Hiérarchie visuelle obligatoire

```text
HeaderPage
├── Titre
├── Description
├── Actions
└── Onglets éventuels sur la border-bottom

Toolbar — une seule ligne
├── Recherche
├── Filtres rapides
├── Actions rapides
├── Actions de masse
└── Export / Actions secondaires

Zone de filtres — en colonnes
├── Filtre 1
├── Filtre 2
├── Filtre 3
└── Autres filtres

Contenu principal
└── Tableau / TreeView / Dashboard / Rapport

Pagination / Pied de page si nécessaire
```

### Règles obligatoires

- Une seule toolbar par workspace.
- La toolbar reste sur une seule ligne sur desktop.
- Les filtres avancés sont toujours placés sous la toolbar.
- Les filtres avancés sont organisés en colonnes.
- Les onglets de navigation sont toujours intégrés au `HeaderPage`.
- Les onglets utilisent la `border-bottom` du `HeaderPage`.
- Les onglets ne sont jamais placés sous les filtres ni dans le contenu principal.
- Les filtres ne sont jamais mélangés aux actions principales.

Sur mobile, les filtres peuvent être empilés verticalement. La toolbar conserve néanmoins une seule ligne horizontale et peut devenir scrollable horizontalement si nécessaire.

## Statuts et cycle de vie

Un statut n’est jamais édité avec une liste déroulante dans un formulaire.

Les transitions de statut sont des actions métier explicites :

- activer ;
- suspendre ;
- valider ;
- publier ;
- clôturer ;
- archiver ;
- réactiver ;
- annuler.

Cette séparation permet de contrôler les transitions autorisées, demander un motif, appliquer les permissions et alimenter l’historique.

## Formulaires

- Pas d’onglets dans les formulaires.
- Jusqu’à 10 champs : formulaire simple.
- De 10 à 20 champs : sections.
- Au-delà de 20 champs : réévaluer la page ou utiliser un assistant si le processus est ordonné.
- Deux colonnes pour les champs courts ; une colonne pour les champs longs.
- Boutons en bas à droite : `Annuler | Enregistrer`.
- Enregistrement explicite, sans autosave.
- Champs obligatoires marqués par `*`.
- Validation immédiate pour les formats et champs requis ; validation métier à l’enregistrement.

## Dialogues

Les drawers ne sont pas utilisés dans GeeCole.

- **Modal** : formulaire court ou moyen, action unique, consultation rapide.
- **Page dédiée** : workflow complexe, nombreuses sections, onglets ou logique métier riche.
- **Wizard** : uniquement pour un processus ordonné, comme l’inscription, l’import ou la clôture annuelle.
- Une modal de prévisualisation est en lecture seule, sans onglets, et propose l’ouverture de la fiche complète.
- Les modales imbriquées sont interdites.
- Tailles officielles : S, M et L.
- Fermeture disponible par Annuler, Échap et icône de fermeture.
- Une erreur d’enregistrement ne ferme jamais automatiquement la modal.

## Tables et listes

- `DataTable` pour les listes plates.
- `TreeView` ou `TreeTable` uniquement pour une hiérarchie réelle.
- Les lignes métier sont compactes sur desktop.
- La première colonne contient l’information principale et une information secondaire discrète.
- Une à trois actions de ligne visibles, puis menu `⋮`.
- Le clic porte sur l’élément principal, pas sur toute la ligne.
- Les cases à cocher ne sont affichées que si des actions de masse existent.
- Les statuts sont affichés avec un badge textuel.
- Les valeurs absentes sont affichées par `—`.
- Pagination standard : 25, 50 ou 100 lignes.

## Fiches métier

Une fiche complète reste dans le workspace de sa fonctionnalité.

Le header contient : retour vers la liste, identité, identifiant secondaire, statut et actions.

Une fiche peut utiliser des cards lorsqu’elles structurent réellement l’information, mettent en avant un indicateur, une alerte, une sélection ou un composant métier. Les cards ne doivent pas devenir un conteneur systématique autour de chaque section.

### Onglet Aperçu

L’onglet `Aperçu` fournit une synthèse dense et immédiatement lisible :

- il utilise principalement une ou plusieurs `SummaryList` sous forme attribut-valeur ;
- il peut contenir quelques cards utiles pour les KPI, alertes ou raccourcis ;
- il renvoie vers les onglets détaillés ;
- il ne recopie pas intégralement les tableaux et informations des autres onglets.

Les autres onglets peuvent utiliser les composants les plus adaptés à leur métier : tables, cards, timelines, explorateur documentaire, workflow ou rapports.

Les onglets représentent des domaines de données, jamais des actions. Les valeurs en consultation sont rendues comme du texte lisible, jamais comme des champs désactivés.

## Historique métier

L’`AuditTimeline` doit répondre à :

- qui a fait l’action ;
- quelle action a été réalisée ;
- quand elle a été réalisée.

Pour les opérations importantes, elle peut aussi afficher le motif et la valeur précédente/nouvelle. Elle ne montre jamais d’UUID, SQL, identifiants internes ou erreurs Supabase brutes.

## Notifications et retours

- Toast pour un succès simple.
- Message métier compréhensible pour les erreurs.
- Erreurs de champ affichées au niveau du champ.
- Confirmation uniquement pour les actions destructrices ou à fort impact.
- Les boutons de confirmation portent le nom de l’action, jamais Oui/Non.
- Une saisie de confirmation peut être exigée pour une action exceptionnellement critique.
- `Undo` est préféré lorsque l’action est facilement réversible.
- Les traitements longs affichent leur progression.
- Les traitements de masse produisent un rapport détaillé.
- Les états durables sont affichés dans la page par un message persistant.
- Les icônes importantes sont accompagnées de texte.

## Navigation globale

La sidebar principale contient 7 à 9 modules maximum.

Le second menu du module organise les fonctionnalités par rubriques repliables. L’état replié n’est pas persisté entre les sessions.

La navigation fournit :

- favoris de fonctionnalités et d’objets métier ;
- éléments récents ;
- recherche globale ;
- sélecteur d’année scolaire ;
- sélecteur d’établissement si nécessaire ;
- notifications utiles ;
- liste distincte `Mes tâches` ;
- fil d’Ariane limité à trois niveaux ;
- retour intelligent conservant filtres, tri et pagination ;
- raccourcis clavier essentiels ;
- dashboard adapté au rôle.

Le sélecteur d’année scolaire n’est pas proposé aux profils Parent et Élève.

## Composants métier officiels

Les composants partagés GeeCole encapsulent PrimeReact et les règles UX du produit :

- `Workspace`
- `WorkspaceHeader`
- `EntityHeader`
- `SmartFilterBar`
- `SummaryList`
- `BulkActionBar`
- `StatusActionMenu`
- `AuditTimeline`
- `WorkflowTracker`
- `DocumentExplorer`
- `ReportRunner`
- `SearchPalette`
- `QuickActions`
- `YearSwitcher`
- `EstablishmentSwitcher`
- `EmptyState`

Les composants PrimeReact sont des briques techniques. Les écrans métier doivent utiliser en priorité les composants GeeCole.

## Documents

GeeCole possède un véritable explorateur documentaire transverse organisé par dossiers, par exemple :

- Documents administratifs ;
- Bulletins ;
- Paiements ;
- Correspondances ;
- Contrats ;
- Diplômes ;
- Paie.

Le `DocumentExplorer` fournit une expérience commune dans tous les modules : nom, catégorie, date, auteur, version, taille, téléchargement et historique.

## Permissions

Une action ou un onglet non autorisé est masqué, pas désactivé.

Les informations sensibles, comme les salaires, sanctions, données médicales et documents confidentiels, sont protégées au niveau de l’interface et du backend.