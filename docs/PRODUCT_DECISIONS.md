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

## V1-015 — Périodes configurées par cycle

Les périodes scolaires sont configurées dans le cycle pour une année scolaire donnée.

Exemples :

- le cycle primaire peut utiliser trois trimestres ;
- le collège peut utiliser trois trimestres avec d'autres dates ;
- un autre cycle peut utiliser deux semestres.

Les niveaux rattachés au cycle héritent automatiquement de ses périodes. L'enseignant ne configure jamais les périodes.

## V1-016 — Matières héritées du cycle

Les matières sont configurées au niveau de l'établissement et de l'année scolaire, puis associées aux cycles.

Les niveaux rattachés au cycle héritent de ces matières. Une configuration spécifique à un niveau ne doit être ajoutée que lorsqu'un besoin métier réel l'exige.

L'enseignant sélectionne un cours existant ; il ne crée ni la matière ni son rattachement pédagogique lors de la saisie d'une évaluation.

## V1-017 — Cours évalué

Pour créer une évaluation, l'enseignant choisit d'abord un cours auquel il est affecté.

Le cours détermine automatiquement :

- l'année scolaire ;
- le cycle et le niveau ;
- la classe, lorsqu'elle existe ;
- la matière ;
- l'enseignant.

Tous les champs corrélés utilisent des listes déroulantes filtrées. Aucun champ libre ne doit permettre de contourner la configuration scolaire.

## V1-018 — Types d'évaluation

Les types d'évaluation sont configurés par l'établissement et proposés dans une liste déroulante.

Exemples possibles :

- interrogation ;
- devoir ;
- composition ;
- examen ;
- participation.

Un enseignant ne peut pas inventer librement un nouveau type pendant la saisie d'une note. L'établissement peut activer, désactiver, renommer et configurer ses types d'évaluation.

Cette décision permet d'utiliser les types d'évaluation comme variables fiables dans les formules de calcul.

## V1-019 — Saisie groupée et saisie individuelle des notes

GeeCole permet deux parcours complémentaires :

- saisir les résultats d'une évaluation pour toute une classe ;
- ajouter ou modifier une note pour un seul élève.

La saisie individuelle ne crée pas une note sans contexte : elle reste liée à un cours, une période, un type d'évaluation et une évaluation identifiable.

## V1-020 — Assiduité fondée sur les absences

GeeCole n'enregistre pas systématiquement la présence de chaque élève.

Le principe est :

> un élève est considéré présent tant qu'aucune absence ou aucun retard n'est déclaré.

L'utilisateur enregistre seulement les exceptions :

- absence ;
- retard ;
- absence ou retard justifié ;
- éventuellement départ anticipé si ce besoin est confirmé.

Une absence peut être rattachée à un cours précis ou enregistrée sans cours pour représenter une absence générale à la journée.

## V1-021 — Formules simples basées sur les types d'évaluation

Les calculs de notes utilisent des formules configurables mais volontairement simples.

Les variables disponibles correspondent aux types d'évaluation configurés par l'établissement.

Exemple conceptuel :

`(DEVOIR + COMPOSITION × 2) / 3`

GeeCole doit :

- proposer uniquement les variables existantes ;
- vérifier la validité de la formule avant son activation ;
- empêcher les fonctions ou expressions complexes non prévues ;
- afficher un aperçu compréhensible du calcul ;
- conserver la formule utilisée pour chaque période afin de préserver l'historique.

## V1-022 — Publication des bulletins

Les bulletins sont d'abord calculés et contrôlés, puis publiés par lot.

Lors de la publication, GeeCole analyse tous les élèves concernés et produit un résultat détaillé :

- bulletin publié ;
- bulletin non publiable ;
- motif précis du blocage.

Exemples de blocage :

- note obligatoire manquante ;
- formule impossible à évaluer ;
- matière ou coefficient mal configuré ;
- élève sans inscription valide ;
- période incomplète.

Un échec sur un élève ne bloque pas la publication des bulletins valides des autres élèves. Les bulletins publiés sont archivés dans l'espace documentaire de chaque élève.

---

## Points encore à valider

### Types d'évaluation

La direction retenue pour la V1 est une liste paramétrable par l'établissement plutôt qu'une saisie libre. Il reste à définir les paramètres exacts d'un type : coefficient par défaut, barème par défaut, utilisation dans les formules et caractère obligatoire ou non.

### Assiduité

Il reste à préciser si une absence non rattachée à un cours couvre automatiquement toute la journée et comment elle interagit avec des absences déjà enregistrées pour certains cours.

### Formules

Il reste à définir la syntaxe exacte autorisée et le comportement lorsqu'un élève n'a aucune note pour l'un des types utilisés dans la formule.

---

## Workflow V1 de référence

Configuration de l'établissement
→ activation annuelle des cycles et niveaux
→ configuration des cycles et niveaux actifs
→ configuration des périodes et matières par cycle
→ création ou sélection des classes
→ création des cours et affectation des enseignants
→ création de l'élève
→ recherche ou création de ses parents
→ détection automatique de la fratrie
→ inscription et affectation
→ suivi des documents administratifs
→ déclaration des absences et retards
→ création des évaluations et saisie des notes
→ calcul et publication des bulletins
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