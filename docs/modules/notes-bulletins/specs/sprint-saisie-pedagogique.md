# Sprint — Saisie pédagogique

## Objectif

Permettre à un établissement de créer des évaluations, saisir les notes d’une classe dans une grille et verrouiller les résultats avant leur consommation par le moteur de calcul.

## Périmètre livré

- création et modification d’une évaluation ;
- rattachement obligatoire à une année, une période, une classe, une matière annuelle et un type d’évaluation ;
- barème propre à l’évaluation ;
- cahier de notes par classe ;
- statuts `graded`, `absent`, `exempt`, `missing` ;
- commentaire individuel ;
- enregistrement groupé par RPC transactionnelle ;
- verrouillage définitif de l’évaluation ;
- RLS pour les membres en lecture et les rôles `owner`, `admin`, `teacher` en écriture ;
- tests unitaires du domaine de saisie.

## Règles métier

### Évaluation

Une évaluation appartient à un établissement et à une année scolaire. Elle référence obligatoirement :

- une période réelle de `academic_periods` ;
- une classe de `school_classes` ;
- une matière annuelle de `annual_subjects` correspondant au niveau de la classe ;
- un type d’évaluation de `assessment_types` appartenant à la même année.

La date doit être comprise entre les dates de début et de fin de la période.

### Note élève

Une note ne peut être enregistrée que pour une inscription active dans la classe de l’évaluation.

- `graded` exige une valeur entre `0` et le barème de l’évaluation ;
- `absent`, `exempt` et `missing` interdisent une valeur numérique ;
- une seule ligne existe par élève et par évaluation ;
- l’auteur et la date de saisie sont enregistrés automatiquement.

### Verrouillage

Une évaluation verrouillée ne peut plus être modifiée et ses notes ne peuvent plus être saisies ou corrigées. Le déverrouillage n’est pas inclus dans cette version afin de préserver la traçabilité.

## Limite assumée

Le schéma actuel ne contient pas encore d’affectation enseignant–classe–matière. En conséquence, tout utilisateur ayant le rôle `teacher` dans l’établissement peut saisir les évaluations de cet établissement. Une matrice d’affectation pédagogique devra être introduite avant une ouverture multi-enseignants en production.

## Fichiers principaux

- `supabase/migrations/20260719210000_create_assessments_and_student_grades.sql`
- `src/modules/grades/domain/gradebook.ts`
- `src/modules/grades/services/gradebook.service.ts`
- `src/modules/grades/pages/GradebookPage.tsx`
- `src/modules/grades/domain/gradebook.test.ts`

## Validation locale

```bash
supabase db reset
npm run build
npm run lint
npm run test
```
