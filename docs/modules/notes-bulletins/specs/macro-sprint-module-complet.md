# Macro-sprint — Module Notes et bulletins complet

Ce document décrit le parcours livré : affectations pédagogiques, espace enseignant, cahier contextualisé, évaluations, saisie des notes, calcul des résultats de période, délibérations et bulletins versionnés.

## Parcours

```text
Affectations pédagogiques
→ Mes classes
→ Classe + matière
→ Période
→ Cahier de notes
→ Résultats de période
→ Délibérations
→ Bulletins
```

## Données ajoutées

- `teaching_assignments`
- `period_subject_results`
- `deliberations`
- `report_cards`

## Règles

- Une matière affectée doit appartenir au niveau de la classe.
- Un enseignant ne modifie que les résultats de ses couples classe–matière.
- Le cahier est contextualisé par classe, matière et période.
- Les notes acceptent les statuts noté, absent, dispensé et non noté.
- Les résultats conservent la formule et sa version.
- Les résultats bloqués ou sans formule ne sont pas validables.
- Les délibérations sont réservées à la direction.
- Les bulletins sont des instantanés versionnés publiables par la direction.

## Limites explicites

- Le rendu PDF graphique utilisera ultérieurement le snapshot versionné du bulletin.
- Les coefficients de matières seront raccordés lorsqu’une règle métier validée sera présente dans la documentation.

## Validation locale

```bash
supabase db reset
npm run build
npm run lint
npm run test
```
