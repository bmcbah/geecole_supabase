# ADR-007 — Navigation du module Notes & Bulletins

## Décision

La navigation suit :

```text
Module → Fonctionnalité → Page de travail
```

Le TreeView sert à sélectionner le contexte métier. La page de travail reste stable.

La page de travail ne contient pas une seconde navigation fonctionnelle. Elle
présente uniquement les actions autorisées dans le contexte sélectionné. Le
changement de fonctionnalité passe par la navigation principale du module.

Les types de note, les formules de calcul et les paramètres pédagogiques sont
gérés dans le module Paramétrage. Ils ne sont pas dupliqués dans Notes &
Bulletins.

## Raisons

- éviter des menus trop profonds ;
- adapter les fonctionnalités aux profils ;
- rendre les grands périmètres lisibles ;
- préserver une navigation rapide entre cours, classes, élèves et périodes.

## Conséquences

- les fonctionnalités visibles dépendent des permissions ;
- le TreeView est filtré par périmètre ;
- l’administrateur n’obtient pas automatiquement les droits pédagogiques ;
- les pages de travail sont réutilisées depuis plusieurs entrées.
- la période est résolue depuis le cycle du cours ; une période appartenant à un
  autre cycle ne peut pas être proposée.
