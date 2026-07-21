# Stratégie de migration

## Baseline V1

La V1 n'étant pas encore déployée avec des données de production à conserver, l'historique initial a été remplacé par une baseline déterministe. Les migrations sont ordonnées par dépendances :

1. plateforme et paramétrage ;
2. scolarité ;
3. finances ;
4. notes et bulletins ;
5. personnel.

Les marqueurs `Source consolidée` présents dans les fichiers gardent le lien avec l'historique Git antérieur. Le catalogue GeEcole fait partie de la baseline. Les fixtures de démonstration en sont exclues et restent opt-in.

## Après publication de la baseline

Une fois la baseline partagée ou déployée, elle devient immuable. Toute évolution ultérieure passe par une migration additive, testée sur une base éphémère puis sur une copie anonymisée lorsque des données doivent être reprises.

Chaque lot doit conserver une application compilable, testable et réversible au niveau fonctionnel. Un déploiement existant antérieur à cette baseline exige une procédure de reprise dédiée ; il ne doit pas appliquer directement cette série comme une mise à niveau incrémentale.
