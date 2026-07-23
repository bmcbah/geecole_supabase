# Scolarité — Spécifications UX

## Navigation

- Vue d’ensemble
- Élèves
- Inscriptions
- Classes
- Assiduité
- Documents

Les parcours de nouvelle inscription, préinscription et réinscription sont regroupés dans le workspace **Inscriptions**. Ils ne constituent pas trois fonctionnalités séparées dans la navigation.

Le workspace **Documents** consomme le `DocumentExplorer` transverse de GeeCole. Il ne réimplémente pas une gestion de fichiers propre au module Scolarité.

## Vue d’ensemble

La Vue d’ensemble est le dashboard d’entrée du module Scolarité.

### Première ligne — KPI

Les indicateurs de pilotage sont la première information visible. La ligne peut contenir jusqu’à six KPI sur desktop :

1. élèves inscrits ;
2. dossiers d’inscription en cours ;
3. préinscriptions ;
4. élèves sans classe ;
5. assiduité à traiter ;
6. documents à contrôler.

Chaque KPI ouvre le workspace correspondant avec les filtres déjà appliqués.

La grille utilise six colonnes :

- six KPI : un sixième chacun ;
- trois KPI : un tiers chacun ;
- deux KPI : une moitié chacun ;
- un KPI : toute la largeur.

Aucun espace vide ne doit rester lorsque le nombre de KPI varie selon le profil.

### Deuxième ligne — activité et alertes

La deuxième ligne contient :

- **Actions récentes** ;
- **Alertes du module**.

Avec deux blocs, chacun occupe la moitié de la ligne. Avec un seul bloc, il occupe toute la largeur.

Le bloc `Travail à traiter` n’existe pas séparément : son contenu est absorbé par les alertes.

Les alertes peuvent agréger les domaines Scolarité, Notes et Bulletins lorsqu’elles affectent directement le parcours d’un élève, par exemple :

- élève sans classe ;
- doublon probable ;
- dossier bloqué ;
- document manquant ou à contrôler ;
- absence non justifiée ;
- élève ou cours sans note ;
- bulletin non généré, non validé ou non publié ;
- capacité dépassée ;
- incohérence administrative.

Chaque alerte affiche sa gravité, son domaine, son volume et ouvre le workspace propriétaire filtré.

## Liste des élèves

La liste contient uniquement les élèves dont l’inscription de l’année sélectionnée est `confirmed`.

Les brouillons, préinscriptions, rejets, abandons, annulations et transferts sont gérés dans le workspace **Inscriptions** et ne sont pas proposés comme filtre de la liste Élèves.

### SmartFilterBar

Sur desktop large :

```text
Recherche | Cycle | Niveau | Classe                         Plus de filtres
```

La recherche et jusqu’à trois filtres rapides sont alignés à gauche. `Plus de filtres` est aligné à droite.

Lorsque la largeur diminue, les filtres rapides sont déplacés progressivement dans le `AdvancedFilterPanel` :

- écran moyen : recherche et un ou deux filtres rapides ;
- petit écran : recherche et `Plus de filtres` ;
- très petit écran : recherche compacte et `Plus de filtres`.

Les valeurs des filtres restent actives lorsqu’ils changent d’emplacement.

Le panneau avancé peut contenir notamment : sexe, responsable principal, situation financière, élève sans classe et période d’inscription.

### DataTable

La liste utilise le composant shared `WorkspaceDataTable`, fondé sur la `DataTable` PrimeReact.

Colonnes minimales :

- élève, avec matricule en information secondaire ;
- cycle ;
- niveau ;
- classe ;
- responsable principal ;
- actions.

Pagination standard : 25, 50 ou 100 lignes.

Le clic porte sur le nom de l’élève ou l’action d’ouverture, pas arbitrairement sur toute la ligne.

### Regroupement par responsable

Un switch permet de passer de la table à un regroupement par responsable principal sans perdre les filtres, le tri ni le contexte.

Le regroupement utilise `GroupedDataView` :

- chaque responsable forme un groupe pliable ;
- le groupe affiche le nombre d’enfants ;
- les élèves deviennent visibles lorsque le groupe est déplié ;
- les actions `Tout déplier` et `Tout replier` sont disponibles ;
- cliquer sur un élève ouvre sa fiche.

## Workspace Inscriptions

Le workspace **Inscriptions** gère tout le processus annuel d’entrée d’un élève.

### Actions du header

- `Nouvelle inscription` — action primaire ;
- `Réinscrire un élève` ;
- `Préinscrire` uniquement si la politique de l’établissement l’autorise.

Sur une largeur réduite, les actions secondaires sont regroupées dans `Actions`.

### Liste des dossiers

La liste commune affiche les nouvelles inscriptions, préinscriptions et réinscriptions.

Colonnes minimales :

- élève ou candidat ;
- matricule lorsqu’il existe ;
- origine : nouvelle inscription, préinscription ou réinscription ;
- niveau demandé ou retenu ;
- classe éventuelle ;
- état du dossier ;
- contrôles ;
- dernière activité ;
- action principale ;
- menu `⋮`.

La colonne **Contrôles** affiche une synthèse calculée par le backend :

- blocages ;
- avertissements ;
- informations ;
- prêt à confirmer.

Le frontend ne recalcule jamais si une règle est bloquante. Il affiche les résultats et les actions fournis par le backend.

### Transitions

Les statuts ne sont pas modifiés avec un dropdown.

Les actions métier possibles comprennent notamment :

- soumettre le dossier ;
- confirmer l’inscription ;
- demander un complément ;
- rejeter avec motif ;
- enregistrer l’abandon ;
- annuler avec motif ;
- transférer.

Les actions visibles dépendent des politiques, des contrôles backend et des permissions.

## Assistant d’inscription

Les trois portes d’entrée du workspace Inscriptions ouvrent un assistant adapté :

- nouvelle inscription ;
- préinscription ;
- réinscription.

Le même `WizardWorkspace` fournit le cadre, mais les données, étapes conditionnelles et règles diffèrent selon l’origine.

L’assistant utilise jusqu’à sept étapes courtes :

1. recherche et doublons probables ;
2. identité de l’élève ;
3. responsables ;
4. scolarité ;
5. documents ;
6. frais ;
7. récapitulatif.

La réinscription précharge l’élève existant, les responsables, le parcours précédent et la décision pédagogique disponible.

### Principes d’interaction

- sauvegarde du brouillon sans perdre l’étape courante ;
- indicateur de progression et retour aux étapes précédentes ;
- aucune sidebar interne ;
- recherche d’un responsable existant, notamment par téléphone ;
- champs conditionnels selon les politiques de l’établissement ;
- séparation visuelle entre blocage, avertissement et information ;
- documents marqués fourni, à fournir, non applicable ou illisible/refusé ;
- affichage des frais avant toute confirmation ;
- bouton final libellé selon l’action réelle.

### Formulaires

Un champ long occupe une ligne complète.

Deux petits champs liés peuvent partager une ligne, par exemple prénom/nom ou date/lieu de naissance.

Trois ou quatre champs métier ne sont jamais compressés sur une seule ligne.

Dans les dialogues, un champ par ligne est la règle par défaut ; deux champs par ligne sont autorisés uniquement lorsqu’ils sont courts.

Le récapitulatif présente l’identité, les responsables, la scolarité, la décision pédagogique éventuelle, les documents manquants, les frais, les contrôles et les dérogations.

## Décision pédagogique et confirmation administrative

L’interface distingue explicitement deux notions.

### Décision pédagogique

Elle répond à la question : dans quel niveau ou parcours l’élève doit-il poursuivre sa scolarité ?

Elle peut représenter :

- passage au niveau suivant ;
- redoublement ;
- orientation ;
- admission sous dérogation ;
- décision à confirmer.

Elle peut provenir du dernier bulletin publié, d’un examen, d’un conseil ou d’une décision manuelle autorisée.

Pour un nouvel élève, l’interface distingue le niveau demandé du niveau retenu.

### Confirmation administrative

Elle répond à la question : le dossier remplit-il les conditions pour devenir une inscription officielle ?

Elle vérifie notamment l’identité, les responsables, le niveau, les documents, les doublons, la capacité, la classe, les règles financières et la décision pédagogique lorsqu’elle est obligatoire.

Les deux actions ne doivent jamais être libellées simplement `Valider`.

## Fiche élève

En-tête compact : photo, identité, matricule, niveau, classe et statut.

L’avatar peut être ajouté, remplacé ou supprimé. Sa suppression restaure l’avatar par défaut.

Onglets :

- Aperçu ;
- Identité et contacts ;
- Responsables ;
- Parcours scolaire ;
- Assiduité ;
- Notes et bulletins ;
- Finances ;
- Documents ;
- Historique.

Les onglets sont intégrés au `WorkspaceHeader`, sur sa bordure basse, et ne sont jamais placés dans une card.

L’onglet `Aperçu` présente une synthèse dense sans recopier toutes les données des autres onglets.

Les actions dangereuses demandent un motif, pas seulement une confirmation oui/non.

## Notes et bulletins dans la fiche élève

Les notes sont affichées dans un tableau pleine largeur :

- une ligne par matière ;
- toutes les évaluations de la période ;
- statut ou note et barème ;
- moyenne officielle calculée par le module Notes ;
- appréciation ;
- classement et moyenne générale lorsqu’un bulletin existe.

La fiche Élève ne recalcule pas une moyenne simplifiée. Elle consomme les résultats officiels du module Notes.

Le bulletin visible dans la fiche Élève est le bulletin généré, validé et publié par le module Notes. Il n’est ni dupliqué ni régénéré par le module Scolarité.

## Assiduité

Le workspace Assiduité respecte la structure standard :

- actions globales dans le `WorkspaceHeader` ;
- `SmartFilterBar` sur une ligne ;
- filtres avancés sous la toolbar ;
- `WorkspaceDataTable` PrimeReact ;
- saisie individuelle ou groupée dans des dialogues conformes aux règles de formulaire.

Les filtres rapides prioritaires sont recherche, type et statut de justification. Niveau et classe passent dans le panneau avancé.

## DocumentExplorer

GeeCole utilise un explorateur documentaire transverse commun à tous les modules.

Un document possède :

1. un attachement métier : module, type d’entité et identifiant ;
2. une catégorie ;
3. un document logique ;
4. une ou plusieurs versions physiques dans Supabase Storage.

Exemples d’attachement :

- Scolarité → élève → documents administratifs ;
- Notes → élève et période → bulletin ;
- Personnel → employé → contrat ;
- Finances → paiement → reçu.

Le `DocumentExplorer` fournit :

- dossiers et catégories ;
- vue liste ou grille ;
- recherche et filtres ;
- upload ;
- aperçu ;
- téléchargement ;
- renommage ;
- déplacement de catégorie ;
- remplacement et versions ;
- archivage ou suppression logique ;
- historique ;
- permissions ;
- métadonnées.

Dans la fiche Élève, la catégorie Bulletins expose uniquement les versions consultables selon le workflow du module Notes, en priorité la version publiée courante, avec accès à l’historique lorsque l’utilisateur en a le droit.
