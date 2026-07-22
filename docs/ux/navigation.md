# Navigation

> **Statut : décision consolidée**  
> Référentiel synthétique. Le détail normatif se trouve dans `docs/design-system/README.md`.

## Grammaire générale

La profondeur maximale est :

`Application → Module → Fonctionnalité → Workspace`

- La sidebar principale contient les modules.
- Le second menu du module organise les fonctionnalités par rubriques repliables.
- Les rubriques ne sont pas mémorisées entre les sessions.
- Le workspace est l’espace de travail autonome dans lequel l’utilisateur accomplit l’essentiel de sa tâche métier.
- Les onglets, assistants et composants internes ne créent pas de niveau supplémentaire dans le menu.

## Liste, aperçu et fiche complète

Le parcours standard est :

`Liste → Prévisualisation facultative → Fiche complète`

- Le clic sur l’identité principale ouvre la fiche complète.
- Une modal large peut fournir une prévisualisation rapide en lecture seule.
- La modal de prévisualisation ne contient ni onglets ni édition et propose `Ouvrir la fiche complète`.
- Les drawers ne sont pas utilisés dans GeeCole.
- La fiche complète porte les onglets, les données détaillées et les actions métier.

## Assistants

Le stepper est réservé aux processus réellement ordonnés, notamment :

- inscription et réinscription ;
- import ;
- génération complexe ;
- clôture annuelle ;
- mise en service nécessitant plusieurs validations successives.

Il ne remplace pas les formulaires ordinaires et ne sert pas à organiser une fiche métier.

## Navigation globale

La navigation fournit :

- une recherche globale ;
- des favoris de fonctionnalités et d’objets métier ;
- les éléments récemment utilisés ;
- un sélecteur d’établissement lorsque le contexte est multi-établissement ;
- un sélecteur d’année scolaire pour les profils autorisés ;
- une zone `Mes tâches` séparée des notifications ;
- un fil d’Ariane limité à trois niveaux ;
- un retour intelligent conservant filtres, tri et pagination ;
- des raccourcis clavier essentiels ;
- un tableau de bord adapté au rôle.

Les profils Parent et Élève ne changent pas eux-mêmes l’année scolaire active.
