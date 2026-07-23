# Scolarité — Fondation de données

> **Statut : Phase 1 implémentée**  
> Cette documentation décrit le socle Supabase du module Scolarité. Elle complète `business.md` et ne remplace pas les règles métier.

## Principes

- Le dossier `students` représente durablement l'élève, indépendamment des années scolaires.
- Une `enrollment` représente le parcours administratif d'un élève pour une année scolaire.
- Une inscription confirmée n'est jamais supprimée physiquement.
- Les transitions de statut sont historisées.
- La classe est distincte du niveau et son affectation possède son propre historique.
- Les affectations pédagogiques configurent l'enseignement ; les cours opérationnels en sont dérivés.
- Les notes, bulletins et finances conservent leurs tables propriétaires.
- Toutes les données sont isolées par `institution_id` et protégées par RLS.

## Tables existantes conservées

La Phase 1 étend les tables existantes au lieu de les recréer :

- `students`
- `guardians`
- `student_guardians`
- `enrollments`
- `enrollment_policies`
- `school_classes`
- `class_assignments`
- `pedagogical_assignments`
- `pedagogical_assignment_periods`

Cette approche préserve les dépendances actuelles des modules Finances et Notes.

## Cycle de vie d'une inscription

L'enum `enrollment_status` contient :

```text
draft
pre_registered
pending
confirmed
rejected
withdrawn
cancelled
transferred
```

La contrainte d'unicité existante garantit une seule inscription courante par élève et par année, hors inscriptions rejetées, retirées ou annulées.

## Extensions de `students`

Champs ajoutés :

- `auth_user_id` : compte utilisateur facultatif associé à l'élève ;
- `created_by` ;
- `updated_by`.

Le matricule reste unique par établissement via `(institution_id, matricule)`.

## Responsables

### `guardians`

Champs ajoutés :

- `email` ;
- `status` : `active` ou `inactive` ;
- `created_by` ;
- `updated_by`.

### `student_guardians`

La relation N:N conserve les rôles existants et reçoit :

- `starts_on` ;
- `ends_on` ;
- `created_by` ;
- `created_at`.

La période d'association permet de conserver l'historique sans supprimer la relation.

## Extensions de `enrollments`

Champs ajoutés :

- `requested_academic_year_level_id` ;
- `pedagogical_decision` ;
- `pedagogical_decision_reason` ;
- `pedagogical_decision_by` ;
- `pedagogical_decision_at` ;
- `confirmed_by` ;
- `rejection_reason` ;
- `withdrawal_reason` ;
- `transfer_destination` ;
- `lifecycle_snapshot` ;
- `updated_by`.

`academic_year_level_id` reste le niveau administratif affecté. `requested_academic_year_level_id` conserve le niveau demandé avant décision.

`lifecycle_snapshot` stocke les valeurs effectivement appliquées à l'inscription : politiques, niveau, cycle et autres données nécessaires à la non-rétroactivité.

## Historique des statuts

### `enrollment_status_history`

Chaque création et chaque transition produit une ligne comprenant :

- l'inscription ;
- l'ancien statut ;
- le nouveau statut ;
- le motif disponible ;
- l'auteur ;
- la date.

Le trigger `enrollments_track_status` alimente automatiquement cette table.

## Résultats des contrôles

### `enrollment_validation_results`

Cette table reçoit les résultats du futur moteur de validation :

- `blocking` ;
- `warning` ;
- `information` ;
- `success`.

Un code de contrôle est unique par inscription. Une nouvelle évaluation peut mettre à jour le résultat ou marquer sa résolution avec `resolved_at`.

La Phase 1 crée le stockage. L'orchestration et les RPC appartiennent à la Phase 2.

## Classes

### `school_classes`

La table existante conserve : année, niveau, nom, code, capacité et état actif. La Phase 1 ajoute `created_by` et `updated_by`.

### `class_assignments`

Une affectation active unique est autorisée par inscription. Les colonnes `starts_on`, `ends_on` et `end_reason` conservent les transferts de classe. `ended_by` identifie l'auteur de la clôture.

## Affectations pédagogiques

Les tables existantes `pedagogical_assignments` et `pedagogical_assignment_periods` restent la source de configuration.

Une affectation contient :

- l'année scolaire ;
- la classe ;
- la matière éventuelle ;
- l'enseignant ;
- le rôle ;
- la portée annuelle ou par périodes.

La Phase 1 renforce les index d'unicité et ajoute `updated_by`.

## Cours générés

### `academic_courses`

Un cours opérationnel est identifié par :

```text
année scolaire + affectation + classe + matière + enseignant + période
```

Il ne peut référencer qu'une affectation pédagogique active et cohérente. La génération automatique des lignes appartient à la Phase 2.

États :

- `active` ;
- `inactive` ;
- `cancelled`.

## Assiduité

### `attendance_records`

Une ligne d'assiduité référence :

- l'établissement et l'année ;
- l'élève et son inscription confirmée ;
- la classe active ;
- éventuellement le cours ;
- la date et éventuellement la période ;
- le type d'événement ;
- l'état de justification.

Types d'événement :

- `absence` ;
- `late` ;
- `present` ;
- `excused`.

États de justification :

- `not_required` ;
- `pending` ;
- `justified` ;
- `rejected`.

Un retard doit obligatoirement contenir `minutes_late`. Les autres événements ne doivent pas en contenir.

## Contraintes principales

- matricule unique par établissement ;
- une inscription courante par élève et par année ;
- élève, année et niveau de l'inscription dans le même établissement ;
- impossibilité de supprimer une inscription confirmée ;
- une affectation de classe active par inscription ;
- cours cohérent avec l'affectation pédagogique et sa période ;
- assiduité autorisée uniquement pour une inscription confirmée affectée à la classe ;
- cours d'assiduité appartenant à la même année et à la même classe.

## RLS

Les nouvelles tables activent RLS :

- lecture pour les membres actifs de l'établissement ;
- gestion des inscriptions et de l'assiduité pour `owner`, `admin` et `secretary` ;
- gestion des cours générés pour `owner` et `admin`.

La Phase 2 devra privilégier des RPC métier `security definer` avec `search_path = ''` pour les transitions sensibles, plutôt que des mises à jour directes depuis le frontend.

## Migration

La fondation est livrée par :

```text
supabase/migrations/20260723120000_schooling_phase_1_foundation.sql
```

La migration est additive afin de préserver les données et les intégrations existantes.

## Suite prévue

Phase 2 :

- moteur de validation des inscriptions ;
- RPC de transition explicites ;
- génération du matricule selon la politique ;
- confirmation administrative ;
- génération des frais ;
- génération et synchronisation des cours ;
- audit métier des opérations sensibles.
