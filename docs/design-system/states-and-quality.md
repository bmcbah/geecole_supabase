# États d’interface et qualité GeeCole

> **Statut : décision consolidée**

## États vides

Un état vide explique :

- pourquoi aucun élément n’est affiché ;
- ce que l’utilisateur peut faire ;
- l’action principale disponible.

Exemple :

```text
Aucune affectation

Aucun enseignant n’est encore affecté à cette classe.

[Affecter un enseignant]
```

## Erreurs

L’interface n’affiche jamais directement :

- erreur SQL ;
- UUID ;
- code Supabase brut ;
- stack trace.

Elle fournit un message métier compréhensible et, si nécessaire, un identifiant de diagnostic discret pour le support.

## Absence de permission

Une page inaccessible affiche clairement que l’utilisateur ne possède pas les droits nécessaires. Les actions et onglets non autorisés restent masqués.

## Donnée introuvable

L’interface distingue autant que possible :

- donnée inexistante ;
- donnée supprimée ;
- donnée inaccessible ;
- donnée hors de l’établissement ou de l’année courante.

## Tests de workspace

Chaque workspace important couvre au minimum :

- rendu nominal ;
- chargement ;
- état vide ;
- erreur ;
- permissions ;
- action principale ;
- comportement responsive principal.

## Tests E2E

Les parcours critiques sont couverts avec Playwright, notamment :

- inscription et réinscription ;
- saisie et validation des notes ;
- génération des bulletins ;
- affectation des enseignants ;
- encaissement ;
- calcul et validation de la paie ;
- clôture de l’année scolaire.

## Définition de terminé

Un workspace n’est pas terminé sans :

- états de chargement ;
- état vide ;
- gestion des erreurs ;
- permissions ;
- responsive ;
- tests principaux ;
- textes métier compréhensibles.
