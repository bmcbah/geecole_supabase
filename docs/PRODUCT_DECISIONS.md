# GeeCole — Décisions produit V1

Ce document est la source de vérité fonctionnelle de GeeCole. Il consigne uniquement les décisions métier validées pour la V1.

## Principes produit

- GeeCole est une application de gestion scolaire, pas un ERP.
- La V1 privilégie la simplicité et évite les abstractions anticipées.
- Toute donnée connue de GeeCole est préremplie.
- Toute donnée calculable est calculée.
- Toute donnée générable est générée automatiquement.
- Toute étape sans valeur métier directe est supprimée.
- Chaque écran doit pouvoir être expliqué rapidement à une secrétaire ou à un directeur d'école.

---

## V1-001 — Catalogue scolaire guinéen

GeeCole embarque le catalogue officiel des cycles et niveaux scolaires guinéens.

L'établissement ne crée ni cycle ni niveau. Il sélectionne et configure ceux fournis par GeeCole.

## V1-002 — Activation annuelle des cycles et niveaux

Chaque année scolaire possède sa propre structure pédagogique.

L'établissement active, pour l'année concernée :

- les cycles ouverts ;
- les niveaux ouverts à l'intérieur de chaque cycle.

Un établissement peut activer seulement une partie des niveaux d'un cycle. La configuration d'une année n'altère jamais l'historique des années précédentes.

## V1-003 — Catalogue, activation et configuration

GeeCole distingue trois niveaux de gestion :

1. **Catalogue** : défini par GeeCole et non modifiable par l'établissement.
2. **Activation** : choix annuel des cycles et niveaux utilisés.
3. **Configuration** : paramètres propres à l'établissement pour chaque cycle ou niveau activé.

Chaque cycle et niveau dispose d'une case **Activer** et, lorsqu'il est actif, d'une action **Configurer**.

## V1-004 — Organisation des classes

Deux modes sont disponibles :

- **Niveau = classe** : le niveau est directement utilisé comme groupe d'affectation.
- **Plusieurs classes par niveau** : l'établissement crée seulement les sections, par exemple A, B ou C. GeeCole compose automatiquement le nom complet, par exemple « 7e A ».

La salle et la capacité maximale restent facultatives. Le code de classe est généré automatiquement lorsqu'il est nécessaire.

## V1-005 — Affectation des élèves

L'affectation à un niveau ou à une classe se réalise depuis :

- la fiche élève ;
- la liste des élèves ;
- les parcours d'inscription ou de réinscription.

Elle ne se réalise pas depuis la création d'une classe dans les paramètres.

## V1-006 — Années scolaires

Une seule année scolaire peut être active à la fois.

Une année clôturée conserve son historique et ne doit plus permettre de modifications ordinaires de sa structure pédagogique.

## V1-007 — Documents exigés par l'établissement

L'établissement configure sa propre liste de documents administratifs à fournir.

Pour chaque type de document, il peut définir :

- son libellé ;
- s'il est obligatoire ou facultatif ;
- son utilisation dans le parcours d'inscription.

L'absence d'un document obligatoire peut rendre le dossier incomplet sans empêcher nécessairement la création de l'élève. Le comportement de blocage relève de la politique d'inscription de l'établissement.

## V1-008 — Terminologie « Parent »

L'interface utilise le terme **Parent** plutôt que **Responsable**.

Un élève peut être lié à plusieurs parents. Un parent peut être lié à plusieurs élèves.

Les propriétés propres à la relation restent portées par le lien parent–élève, notamment :

- type de lien : père, mère, tuteur ou autre ;
- contact principal ;
- réception des notifications ;
- autorisation de récupération de l'élève ;
- responsabilité financière, si elle est retenue dans le périmètre.

## V1-009 — Recherche et réutilisation d'un parent

Lors de l'ajout d'un parent, GeeCole recherche d'abord une personne existante.

La recherche utilise principalement :

- le numéro de téléphone, requis pour identifier et contacter le parent ;
- l'adresse email, facultative.

Si le parent existe, il est associé à l'élève sans être dupliqué. Sinon, il est créé puis associé.

## V1-010 — Fratrie calculée

Il n'existe ni table « Famille » ni table « Fratrie ».

Deux élèves sont considérés comme appartenant à la même fratrie lorsqu'ils partagent au moins un parent.

La fratrie est calculée et affichée automatiquement dans la fiche élève.

## V1-011 — Préinscription

La préinscription prépare l'inscription d'un élève dans une année scolaire future.

Exemple : depuis l'année 2025–2026, un élève peut être préinscrit pour 2026–2027.

La préinscription ne remplace pas l'inscription actuelle. Elle doit pouvoir être confirmée ultérieurement pour devenir une inscription effective.

## V1-012 — Réinscription

La réinscription se réalise depuis l'année scolaire active en reprenant les élèves de l'année scolaire précédente.

GeeCole détermine automatiquement :

- l'année cible : l'année active ;
- l'année source : l'année précédente.

L'utilisateur ne choisit pas librement deux années quelconques.

## V1-013 — Réinscription groupée par classe

La réinscription groupée part d'une classe ou d'un niveau de l'année précédente.

L'utilisateur sélectionne les élèves à réinscrire à l'aide de cases à cocher.

GeeCole propose automatiquement le niveau suivant lorsqu'il est actif dans l'année cible.

Les cas particuliers restent modifiables individuellement :

- redoublement ;
- départ de l'établissement ;
- niveau suivant non activé ;
- classe cible non encore définie ;
- dossier documentaire incomplet.

## V1-014 — Espace documentaire de la fiche élève

L'onglet de la fiche élève devient un espace documentaire complet, et non une simple vue des pièces d'inscription.

La navigation de cet espace distingue au minimum :

- **Documents administratifs** ;
- **Bulletins** ;
- **Relevés de notes** ;
- **Certificats et attestations** ;
- **Autres documents scolaires**.

Les documents administratifs regroupent notamment les pièces demandées lors de l'inscription. Les documents pédagogiques générés par GeeCole sont conservés dans le même espace documentaire de l'élève.

---

## Workflow V1 de référence

Configuration de l'établissement
→ activation annuelle des cycles et niveaux
→ configuration des cycles et niveaux actifs
→ création ou sélection des classes
→ création de l'élève
→ recherche ou création de ses parents
→ détection automatique de la fratrie
→ inscription et affectation
→ suivi des documents administratifs
→ préinscription ou réinscription pour l'année suivante

---

## Méthode de stabilisation

Pour chaque module :

1. auditer l'existant ;
2. présenter les éléments validés, à améliorer et bloquants ;
3. valider les règles métier ;
4. implémenter ;
5. tester ;
6. passer au module suivant.

Toute amélioration non requise pour la V1 est placée dans le backlog V2 et n'est pas implémentée pendant la stabilisation.
