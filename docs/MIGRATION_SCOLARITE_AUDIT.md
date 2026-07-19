# Audit de migration — Scolarité V1

## Règle de travail

La branche `agent/migration-scolarite-v1` remplace progressivement l’ancien modèle scolaire au lieu d’empiler des concepts parallèles.

Aucune suppression n’est réalisée sans avoir identifié :

- les tables concernées ;
- les services et écrans qui les utilisent ;
- les données à conserver ;
- le chemin de migration ou de reprise ;
- les tests de non-régression associés.

## Ordre de stabilisation

1. périodes et matières par cycle annuel ;
2. enseignants et affectations ;
3. cours générés ;
4. évaluations et notes ;
5. assiduité ;
6. bulletins ;
7. suppression des anciens chemins devenus inutilisés.

## Conditions avant fusion

- reset complet de la base locale ;
- tests pgTAP ;
- génération des types Supabase ;
- format, lint, tests unitaires et build ;
- recette fonctionnelle des parcours principaux ;
- validation explicite du propriétaire du projet.

La pull request reste en brouillon jusqu’à cette validation.
