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

Ordre recommandé :

```text
Établissement → Cycle → Niveau → Matière → Période
```

La règle active la plus spécifique est appliquée et sa provenance reste visible.

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
