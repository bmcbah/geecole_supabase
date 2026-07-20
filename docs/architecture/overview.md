# Architecture générale

> **Statut : décision consolidée**  
> Cette documentation intègre les arbitrages validés le 20 juillet 2026.


## Contexte hiérarchique

`Workspace → Établissement → Année scolaire`

Chaque requête métier est exécutée dans ce contexte. Les formulaires ne redemandent pas l’établissement ou l’année lorsqu’ils sont déjà connus.

## Classification des données

- Permanentes : personnes, établissement, identifiants stables.
- Structurelles annuelles : cycles activés, niveaux, classes, périodes, matières, tarifs.
- Opérationnelles annuelles : inscriptions, affectations, cours, évaluations, notes, absences, bulletins, dossiers financiers.

## Modules

Les modules communiquent par services publics, événements métier ou identifiants stables. Un module ne dépend pas directement des tables privées d’un autre module.

## Sécurité

Toutes les tables exposées appliquent RLS et filtrent au minimum par établissement. Les données annuelles sont aussi filtrées par année lorsque le contexte l’exige.
