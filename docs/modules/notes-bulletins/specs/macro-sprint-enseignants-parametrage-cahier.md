# Macro-sprint — Enseignants, paramétrage et cahier de notes

## Objectif

Compléter le module Notes avec un référentiel annuel des enseignants, sécuriser les affectations pédagogiques et transformer le cahier de notes en espace de travail unique.

## Parcours administratif

```text
Personnes et accès
→ attribuer le rôle Enseignant
→ créer le profil professionnel de l'année
→ affecter une classe et une matière
→ l'enseignant voit la classe dans Mes classes
```

L'identité reste portée par la personne existante. Le profil enseignant ne duplique pas le nom, le téléphone ou l'adresse électronique.

## Profil enseignant annuel

Le profil contient :

- compte utilisateur enseignant ;
- matricule employé facultatif ;
- spécialité facultative ;
- statut professionnel : permanent, contractuel, vacataire, stagiaire ou inactif ;
- date de prise de fonction ;
- date de fin de fonction ;
- observations administratives ;
- statut actif pour l'année scolaire.

Une affectation pédagogique exige un profil enseignant actif pour la même année scolaire.

## Paramétrage du module Notes

Le hub de paramétrage contrôle quatre prérequis :

1. enseignants actifs ;
2. affectations pédagogiques ;
3. types d'évaluation actifs ;
4. formules de calcul actives.

Le module est signalé prêt uniquement lorsque les quatre référentiels sont renseignés.

## Cahier de notes

Le cahier est un workspace unique :

```text
Classe + matière + période
→ boutons des évaluations
→ actions Nouvelle / Modifier / Verrouiller / Enregistrer
→ grille des élèves
```

Les évaluations ne sont plus affichées dans un premier tableau séparé de la saisie. La sélection d'une évaluation met immédiatement à jour la grille.

## Données ajoutées

- `teacher_profiles`
- enum `teacher_employment_status`

## Écrans ajoutés

- `/notes/enseignants`
- `/notes/parametrage`

## Écrans modifiés

- `/notes/affectations`
- `/notes/cahier`

## Impact documentaire

Ce document complète le macro-sprint Notes et bulletins existant. Il ne remplace pas les décisions déjà consignées sur les formules, les résultats, les délibérations ou les bulletins.

## Validation locale

```bash
supabase db reset
npm run build
npm run lint
npm run test
```
