# Migration Scolarité V1

**Statut :** démarrée

Ce document pilote la migration progressive de GeeCole vers le modèle fonctionnel validé dans `PRODUCT_DECISIONS.md` et `SCOLARITE_AFFECTATIONS.md`.

## 1. Couverture fonctionnelle validée

Le périmètre de base est suffisamment couvert pour commencer l'implémentation :

- établissement et année scolaire active ;
- catalogue officiel des cycles et niveaux ;
- activation annuelle des cycles et niveaux ;
- classes et affectation des élèves ;
- fiche élève permanente et inscriptions annuelles ;
- plusieurs parents par élève et fratrie calculée ;
- documents administratifs et documents scolaires générés ;
- préinscription et réinscription groupée ;
- frais, dossiers financiers, échéances et encaissements ;
- périodes configurées par cycle et héritées par les niveaux ;
- matières configurées par cycle ;
- enseignants et affectations pédagogiques ;
- génération des cours depuis les affectations ;
- absences et retards enregistrés comme exceptions ;
- types d'évaluation contrôlés par l'établissement ;
- saisie groupée et individuelle des notes ;
- moyenne des notes par type d'évaluation ;
- formules simples ;
- calcul, contrôle et publication par lot des bulletins.

## 2. Décisions non bloquantes restant à affiner

Ces sujets devront être finalisés pendant les lots concernés, sans empêcher le démarrage du socle :

- comportement d'une formule lorsqu'une variable ne possède aucune note ;
- interaction entre une absence générale et les absences liées à un cours ;
- paramètres exacts d'un type d'évaluation ;
- modèle visuel final du bulletin ;
- périmètre V1 de l'emploi du temps et des notifications.

## 3. Principe de migration

La migration est additive et progressive.

- Les migrations Supabase déjà partagées ne sont jamais modifiées.
- Les nouvelles structures sont introduites par de nouvelles migrations.
- Les écrans sont migrés module par module.
- Les anciennes structures ne sont supprimées qu'après reprise des données et validation fonctionnelle.
- Chaque lot doit conserver une application compilable et testable.

## 4. Ordre des lots

### Lot M1 — Socle pédagogique

Objectif : rendre le modèle annuel exploitable par les futurs modules pédagogiques.

Structures visées :

- périodes d'un cycle annuel ;
- catalogue et activation des matières ;
- enseignants de l'établissement ;
- affectations pédagogiques par classe, matière et période ;
- enseignant principal d'une classe ;
- cours générés depuis les affectations.

Écrans visés :

- configuration des périodes dans le cycle annuel ;
- configuration des matières du cycle ;
- liste et fiche enseignant ;
- grille des affectations ;
- liste des cours générés.

### Lot M2 — Élèves et parents

Objectif : aligner la fiche élève sur le modèle permanent et relationnel validé.

- recherche d'un parent par téléphone ;
- plusieurs parents par élève ;
- propriétés portées par le lien parent–élève ;
- fratrie calculée ;
- avatar élève modifiable ;
- espace Documents administratifs élargi.

### Lot M3 — Inscriptions et réinscriptions

- création simplifiée de l'élève ;
- inscription annuelle ;
- affectation depuis la fiche et la liste ;
- préinscription ;
- réinscription groupée ;
- reprise contrôlée des classes et niveaux.

### Lot M4 — Assiduité

- absence générale ou liée à un cours ;
- retard ;
- justification ;
- présence implicite ;
- vues par élève, classe et période.

### Lot M5 — Évaluations et notes

- types d'évaluation configurables ;
- création d'une évaluation depuis un cours ;
- saisie groupée ;
- saisie individuelle ;
- états absent, dispensé et non évalué ;
- agrégation par moyenne du type d'évaluation.

### Lot M6 — Calculs et bulletins

- formules simples basées sur les types d'évaluation ;
- moyenne par matière ;
- moyenne générale ;
- classement facultatif ;
- prévisualisation ;
- publication par lot ;
- rapport détaillé des erreurs ;
- archivage dans la fiche élève.

### Lot M7 — Stabilisation financière et transversale

- vérifier l'intégration inscriptions/frais ;
- vérifier les responsables financiers parmi les parents ;
- droits et rôles ;
- import de données ;
- audit et historique ;
- tests de parcours complets.

## 5. Modèle cible du lot M1

### Période pédagogique

Une période appartient à un cycle activé pour une année scolaire.

Champs métier :

- cycle annuel ;
- nom et code ;
- ordre ;
- date de début et date de fin ;
- statut actif.

Les dates sont configurées une seule fois. Les affectations utilisent les périodes et ne demandent pas de dates ordinaires à l'utilisateur.

### Matière

Une matière provient d'un catalogue GeeCole ou d'une extension contrôlée de l'établissement si ce besoin est confirmé.

L'activation annuelle relie :

- l'établissement ;
- l'année ;
- le cycle ;
- la matière ;
- le coefficient et les paramètres de bulletin.

### Enseignant

L'enseignant est une personne de l'établissement. Son compte utilisateur est facultatif au moment de sa création.

Un enseignant peut donc être planifié avant de recevoir un accès à GeeCole.

### Affectation pédagogique

Une affectation relie :

- l'année scolaire ;
- la classe ;
- la matière ;
- l'enseignant ;
- une ou plusieurs périodes du cycle.

Une affectation principale de classe peut servir de valeur par défaut, notamment au primaire. Une affectation spécifique à une matière est prioritaire.

### Cours généré

Le cours n'est pas créé manuellement. Il est rendu disponible à partir de :

`année + classe + matière + affectation active`

Il sert de contexte aux évaluations, notes, absences liées au cours et futurs créneaux d'emploi du temps.

## 6. Contrôles obligatoires du lot M1

- aucune période ne sort des dates de l'année scolaire ;
- deux périodes d'un même cycle ne se chevauchent pas ;
- une matière affectée est active pour le cycle ;
- l'enseignant appartient à l'établissement ;
- la classe appartient à l'année concernée ;
- deux affectations spécifiques ne se chevauchent pas pour la même classe et matière ;
- une donnée historique utilisée par une évaluation ou un bulletin n'est jamais réécrite rétroactivement ;
- toutes les nouvelles tables exposées utilisent RLS.

## 7. Stratégie de reprise

1. inventorier les tables et écrans existants ;
2. produire la migration additive M1 ;
3. régénérer les types Supabase ;
4. ajouter les services et domaines TypeScript ;
5. créer les écrans de configuration ;
6. reprendre les données existantes lorsqu'une correspondance fiable existe ;
7. basculer les lectures vers le nouveau modèle ;
8. conserver temporairement les anciennes colonnes ou tables comme compatibilité ;
9. supprimer la compatibilité dans un lot ultérieur après validation.

## 8. Critères de fin du lot M1

Le lot est terminé lorsqu'un administrateur peut :

1. ouvrir une année scolaire ;
2. configurer les périodes d'un cycle ;
3. activer les matières du cycle ;
4. créer ou sélectionner les enseignants ;
5. affecter un enseignant principal à une classe ;
6. définir des exceptions par matière et période ;
7. constater que les cours correspondants sont disponibles ;
8. changer un enseignant à partir d'une période sans altérer l'historique précédent.
