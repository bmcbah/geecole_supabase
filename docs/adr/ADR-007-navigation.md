# ADR-007 — Navigation, prévisualisation et fiche complète

## Statut

Accepté — décision révisée en juillet 2026.

## Contexte

La première version de la navigation imposait le parcours `Liste → Drawer → Page profil complète`. Cette règle ajoutait un conteneur intermédiaire difficile à standardiser, encourageait l’édition rapide hors contexte et entrait en conflit avec le modèle de Workspace retenu pour GeeCole.

## Décision

GeeCole adopte le parcours suivant :

`Liste → Prévisualisation facultative → Fiche complète`

- Les drawers ne sont pas utilisés.
- Une modal large peut fournir une prévisualisation rapide en lecture seule.
- La prévisualisation ne contient ni onglets ni édition et propose l’ouverture de la fiche complète.
- La fiche complète reste dans le workspace de la fonctionnalité et porte les onglets, les données détaillées et les actions métier.
- Le stepper est réservé aux assistants correspondant à un processus réellement ordonné.
- Les changements de statut restent des actions métier explicites et ne sont jamais modifiés dans un formulaire générique.

## Conséquences

- Les anciens drawers doivent être migrés vers une modal de lecture seule ou supprimés lorsque l’ouverture directe de la fiche est suffisante.
- Les actions rapides appartiennent au header, à l’onglet concerné ou au composant `QuickActions` selon leur portée.
- Les permissions masquent les actions non autorisées au lieu de les désactiver.
- Les filtres, le tri et la pagination sont restaurés lors du retour vers la liste.
- Les composants et parcours doivent respecter `docs/design-system/README.md` et `docs/ux/navigation.md`.
