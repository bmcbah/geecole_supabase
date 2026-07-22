# Performances Front-End GeeCole

> **Statut : décision consolidée**

## Chargement des modules

Les modules métier sont chargés à la demande. L’ouverture initiale de GeeCole ne doit pas télécharger l’ensemble des fonctionnalités.

## Chargement des données

- pagination côté serveur ;
- filtres côté serveur ;
- tri côté serveur ;
- sélection explicite des colonnes nécessaires ;
- aucun chargement massif de lignes dans le navigateur ;
- pas de `select('*')` par défaut dans les écrans métier.

## Recherche

Les recherches textuelles utilisent :

- un délai de 300 à 500 ms ;
- l’annulation de la requête précédente ;
- un nombre minimal de caractères lorsque nécessaire.

## Cache

Les données relativement stables peuvent être mises en cache :

- cycles ;
- niveaux ;
- matières ;
- catalogues ;
- années scolaires ;
- établissement courant.

Les données transactionnelles ou sensibles sont rafraîchies plus strictement : paiements, notes, paie, validations et permissions.

## États de chargement

Chaque workspace gère explicitement :

- chargement initial ;
- actualisation ;
- état vide ;
- erreur ;
- absence de permission ;
- donnée introuvable ;
- traitement long.

Les skeletons sont privilégiés au chargement initial. Une actualisation utilise un indicateur discret.

## Traitements longs

Les imports, générations massives, clonages, réinscriptions groupées, calculs de paie et traitements similaires suivent :

`Paramètres → Validation → Traitement → Rapport`

Ils ne doivent pas bloquer toute l’interface. Le résultat doit pouvoir être retrouvé dans un historique lorsque le backend le permet.

## React

- éviter les états globaux inutiles ;
- ne pas stocker une donnée calculable ;
- limiter les rerenders des grandes tables ;
- virtualiser uniquement les listes réellement volumineuses ;
- mesurer avant d’ajouter des optimisations ;
- ne pas généraliser `useMemo` et `useCallback` sans besoin démontré.

## Objectif

La performance perçue est prioritaire : retour immédiat sur les actions, états visibles, navigation fluide et absence d’écran bloqué sans explication.
