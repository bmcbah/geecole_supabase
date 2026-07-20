# ADR-007 — Navigation du module Notes & Bulletins

## Décision

La navigation suit :

```text
Module → Fonctionnalité → Page de travail
```

Le TreeView sert à sélectionner le contexte métier. La page de travail reste stable.

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
