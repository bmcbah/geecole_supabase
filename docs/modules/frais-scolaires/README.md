# Module Frais scolaires

## Finalité

Le module Frais scolaires couvre la gestion des créances liées à la scolarité : ce que l'établissement facture, ce que l'élève doit, ce qui a été encaissé et ce qui reste à payer.

Le terme « Finance » n'est pas utilisé pour la V1 afin de ne pas créer une attente de comptabilité complète.

## Périmètre V1

- types de frais ;
- grilles tarifaires annuelles ;
- plans de paiement ;
- dossiers financiers par inscription ;
- avantages tarifaires ;
- échéances ;
- encaissements ;
- affectations ;
- crédits ;
- reçus ;
- annulations ;
- impayés ;
- vue familiale agrégée.

## Hors périmètre V1

- comptabilité générale ;
- dépenses ;
- paie ;
- banque et rapprochement ;
- trésorerie avancée ;
- intégration automatique Mobile Money ;
- portail parent ;
- moteur de règles libre.

## Dépendances

### Paramétrage

Fournit l'établissement, les années scolaires, les cycles, les niveaux, les classes, les utilisateurs et les permissions.

### Scolarité

Fournit les élèves, familles, responsables, inscriptions, réinscriptions et événements de changement de parcours.

La famille reste un sous-domaine de Scolarité. Frais scolaires la consulte sans en devenir propriétaire.

## Principe d'intégration

La scolarité produit des événements métier. Frais scolaires y réagit.

Exemple :

`Inscription validée → dossier financier → frais appliqués → avantages → échéances → prêt à encaisser`

## Agrégats métier

1. **Catalogue annuel** : types de frais utilisés, grille tarifaire, plans et avantages.
2. **Dossier financier** : situation d'une inscription pour une année scolaire.
3. **Encaissement** : paiement reçu, affectations, reçu et éventuelle annulation.
4. **Pilotage** : échéances, impayés, journal et vues agrégées.

## Documents

- [Domaine métier](./domaine-metier.md)
- [Décisions](./decisions.md)
- [Roadmap](./roadmap.md)
- [Spécifications](./specs/README.md)
