# Notes — Règles métier

## Concepts

### Note

Une note est une activité notée créée dans un cours. Elle possède un libellé, une date, un type de note et les résultats des élèves.

### Résultat

Le résultat d’un élève peut être :

- une valeur numérique ;
- absent ;
- dispensé ;
- reporté.

### Type de note

Le type de note vient d’un catalogue GeeCole surchargeable localement.

Exemples : évaluation, devoir surveillé, examen, composition, oral, travaux pratiques, interrogation.

Le type définit le barème. Le barème est imposé à toutes les notes utilisant ce type et ne peut pas être modifié au niveau d’une note.

Une fois le type utilisé, son barème devient immuable. Pour changer de barème, l’établissement crée une nouvelle surcharge locale et désactive l’ancien type.

## Affectation pédagogique

L’affectation contient :

- l’enseignant ;
- la matière ;
- la classe ou le niveau ;
- la portée temporelle ;
- le coefficient du cours.

La portée temporelle peut être :

- toute l’année ;
- une ou plusieurs périodes.

Exemples :

```text
E1 → Mathématiques → 7A → Période 1 → coefficient 4
E2 → Mathématiques → 7A → Toute l’année → coefficient 4
```

Une affectation annuelle rend le cours disponible dans toutes les périodes.

Le cycle peut proposer un comportement par défaut :

- primaire : enseignant principal pour plusieurs matières sur toute l’année ;
- enseignants spécialisés pour certains cours comme le sport ;
- collège et lycée : affectations généralement matière par matière.

Le choix final reste toujours disponible lors de l’affectation.

## Cours

Le cours est le contexte logique :

```text
année + classe/niveau + matière + période
```

L’enseignant autorisé est déterminé par l’affectation active.

## Coefficient du cours

Le coefficient est saisi lors de l’affectation. Il pondère la moyenne de la matière dans la moyenne générale.

Il ne dépend ni d’une note particulière ni du type de note.

## Saisie par classe

Tous les élèves inscrits dans la classe apparaissent automatiquement.

L’enseignant peut sélectionner un ou plusieurs élèves puis :

- saisir une valeur ;
- appliquer absent ;
- appliquer dispensé ;
- appliquer reporté.

## Saisie par élève

Une note peut aussi être créée ou complétée directement pour un élève : rattrapage, oral individuel, note exceptionnelle ou correction ciblée.

La note peut être créée avant que tous les résultats soient saisis. Les résultats sont complétés progressivement.

## Statut reporté

Le résultat reste en attente et aucune nouvelle date n’est obligatoire.

Un résultat reporté bloque :

- la moyenne de la matière ;
- la moyenne générale ;
- la génération définitive du bulletin de l’élève.

Le motif du blocage doit être affiché clairement.

## Calculs

Les types de note ne portent pas de coefficient propre.

La moyenne matière est définie par une expression libre et versionnée. Les codes des types de note actifs sont les seules variables disponibles, par exemple `(DEVOIR + COMPO * 2) / 3`. Pour un type comportant plusieurs évaluations, la variable représente leur moyenne normalisée sur 20. Une version est immuable dès sa création ; toute modification crée une nouvelle version et une version antérieure peut être réactivée.

Une version active est affectée soit à un cycle, soit à un niveau. Il n'existe aucune affectation à une période, une classe, une matière, un cours ou un élève. L'affectation vaut pour toutes les périodes de l'année :

- la formule du niveau est prioritaire sur celle du cycle ;
- à défaut de formule de niveau, la formule du cycle est utilisée ;
- sans formule applicable, la moyenne et le bulletin sont bloqués.

L'expression accepte uniquement les nombres, les variables de types de note, les parenthèses et les opérateurs `+`, `-`, `*`, `/`. Elle est analysée par un évaluateur dédié et ne doit jamais être exécutée avec `eval`. Une variable requise sans note ou une expression invalide bloque le calcul avec un motif explicite. La moyenne générale est ensuite calculée séparément avec le coefficient du cours :

```text
moyenne générale = somme(moyenne matière × coefficient cours) / somme(coefficients cours)
```

Les règles peuvent aussi définir :

- nombre minimal de notes ;
- traitement des absences ;
- traitement des dispenses ;
- traitement des données manquantes ;
- arrondis.

Le bulletin conserve l'identifiant, la version, le périmètre de résolution et le snapshot des règles utilisés. Une nouvelle version ne recalcule jamais silencieusement un bulletin déjà publié.

## Appréciations

Par défaut, l’enseignant de la matière gère l’appréciation de sa matière.

L’établissement peut autoriser d’autres profils.

Toutes les modifications sont historisées. Une modification affectant un bulletin non publié invalide sa validation.

## Historique

Toute donnée ayant produit un document officiel conserve son historique.

Les évolutions passent par un nouvel élément, une désactivation ou une nouvelle version. Une version publiée n’est jamais recalculée silencieusement.
