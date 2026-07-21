# Notes — Modèle fonctionnel et technique

## Entités fonctionnelles

- Affectation pédagogique
- Cours logique
- Type de note
- Note
- Résultat de note
- Formule de calcul
- Appréciation

## Contraintes

- impossible de créer une note sans cours accessible ;
- impossible d’utiliser un type désactivé ;
- barème historiquement stable ;
- résultat numérique limité par le barème ;
- valeur et statut mutuellement exclusifs ;
- reporté rend les agrégats dépendants non calculables ;
- coefficient positif quand la matière entre dans la moyenne générale ;
- corrections auditées.

## Résolution des configurations

Résolution des formules de moyenne matière :

```text
Niveau → Cycle → blocage explicite
```

La formule n'a aucune dimension période. Une seule version active est autorisée par périmètre et par année. Les versions sont immuables et le bulletin en conserve un snapshot.

La version stocke `expression` et `rounding`. L'expression libre utilise les codes des types de note comme variables et est évaluée par un parseur arithmétique limité (`+`, `-`, `*`, `/`, parenthèses), jamais par `eval` ou `Function`.

## API du TreeView

Le backend fournit une hiérarchie filtrée par permissions avec chargement progressif.

Chaque nœud retourne au minimum :

- identifiant ;
- type ;
- libellé ;
- nombre d’enfants ;
- statut agrégé ;
- compteurs d’anomalies ;
- actions autorisées.

## Audit

Historiser :

- création et modification de note ;
- modification de résultat ;
- changement de statut ;
- publication ;
- appréciation ;
- formule ;
- affectation ;
- coefficient.
