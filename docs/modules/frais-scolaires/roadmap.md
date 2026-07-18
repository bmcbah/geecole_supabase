# Roadmap — Frais scolaires

Ce document est le point de reprise officiel du module.

## Règle de progression

Un lot passe par les états suivants :

`à spécifier → spécifié → en développement → en validation → validé`

Le lot suivant ne démarre qu'après validation explicite du précédent, sauf travail technique transversal sans impact métier.

## État actuel

| Lot | Intitulé | Statut | Dépend de |
|---|---|---|---|
| 0 | Fondations métier et architecture annuelle | Validé | — |
| 1 | Catalogue des frais et grilles tarifaires annuelles | Validé | Lot 0 |
| 2 | Plans de paiement | En développement | Lot 1 |
| 3 | Dossiers financiers et facturation | À cadrer | Lots 1 et 2 |
| 4 | Encaissements, affectations et reçus | À cadrer | Lot 3 |
| 5 | Familles et avantages tarifaires | À cadrer | Lots 3 et 4 |
| 6 | Impayés, pilotage et exports | À cadrer | Lots 3 et 4 |
| 7 | Évolutions futures | Backlog | Lots précédents |

## Prochaine étape officielle

**Lot 2 — Implémentation des plans de paiement**

Branche de travail : `feature/lot-02-plans-paiement`.

Objectif : configurer des modèles annuels de paiement, leurs échéances en pourcentage, leurs dates, les frais concernés et leur portée avant la génération des dossiers financiers du Lot 3.

## Lot 0 — Fondations

Livrables :

- principes produit ;
- modèle établissement et année scolaire ;
- vocabulaire métier ;
- décisions structurantes ;
- stratégie de cloisonnement et de traçabilité.

## Lot 1 — Catalogue des frais et grilles tarifaires annuelles

Livrables :

- types de frais permanents au niveau établissement ;
- grille unique par année scolaire ;
- lignes ciblant établissement, plusieurs cycles ou plusieurs niveaux ;
- résolution niveau > cycle > établissement ;
- détection des chevauchements ;
- duplication simple vers une nouvelle année ;
- tableau filtrable par frais, cycle, niveau et statut ;
- écrans et critères d'acceptation.

Décisions UX validées dans `specs/lot-01-parcours-ux.md`.

## Lot 2 — Plans de paiement

Livrables attendus : comptant, tranches, mensualités, échéancier personnalisé, prévisualisation et association aux frais/périmètres.

Spécification de travail : `specs/lot-02-plans-paiement.md`.

## Lot 3 — Dossiers financiers

Livrables attendus : création depuis l'inscription, frais figés, avantages, échéances, soldes et historique annuel.

## Lot 4 — Encaissements

Livrables attendus : recherche, paiement partiel/complet, affectation, surpaiement, crédit, reçu, annulation et audit.

## Lot 5 — Familles et avantages

Livrables attendus : remises configurables, détection de fratrie, recalcul assisté, vue famille et paiement réparti entre enfants.

## Lot 6 — Pilotage

Livrables attendus : journal, échéances en retard, situation des comptes, tableaux de bord sobres et exports.

## Lot 7 — Backlog

- Mobile Money intégré ;
- portail parent ;
- notifications ;
- caisse avancée ;
- remboursements ;
- dépenses ;
- banque ;
- comptabilité.

## Définition de validation d'un lot

Un lot est validé lorsque :

- les règles métier et cas limites sont décidés ;
- les parcours et écrans sont décrits ;
- le modèle de données et les permissions sont approuvés ;
- les critères d'acceptation sont testables ;
- les questions ouvertes bloquantes sont résolues ;
- la documentation reflète la décision finale.