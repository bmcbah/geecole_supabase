# Domaine métier — Frais scolaires

## Vocabulaire

### Type de frais

Nature réutilisable d'un montant facturé : inscription, réinscription, scolarité, transport, cantine, examen ou autre.

### Grille tarifaire annuelle

Ensemble des tarifs configurés pour un établissement et une année scolaire.

### Ligne tarifaire

Association d'un type de frais, d'un montant et d'un périmètre d'application pour une année scolaire.

Le périmètre est exclusivement l'un des suivants :

- tout l'établissement ;
- un ou plusieurs cycles ;
- un ou plusieurs niveaux.

### Plan de paiement

Configuration définissant comment un montant net peut être réparti dans le temps : comptant, tranches, mensualités ou échéancier personnalisé.

### Dossier financier

Agrégat appartenant à une inscription annuelle. Il contient les frais appliqués, avantages, échéances, paiements, crédits et historique.

### Frais appliqué

Copie figée d'une règle tarifaire appliquée à une inscription. Une modification ultérieure de la grille ne modifie pas les dossiers existants sans action explicite.

### Avantage tarifaire

Réduction ou exonération appliquée à un ou plusieurs frais : fratrie, personnel, bourse, convention ou décision exceptionnelle.

### Échéance

Montant attendu à une date donnée. Les états « à venir », « exigible », « partiellement payée » et « en retard » sont calculés à partir des dates et affectations.

### Paiement

Somme effectivement reçue par l'établissement. Un paiement validé n'est pas supprimé.

### Affectation

Répartition d'un paiement vers une ou plusieurs échéances, frais, inscriptions ou années autorisées.

### Crédit

Montant reçu non encore affecté à une dette. Son utilisation doit rester traçable.

### Reçu

Preuve numérotée d'un encaissement validé. Une annulation conserve le reçu d'origine avec son statut.

## Règles structurantes

- devise GNF ;
- montants entiers, sans décimales ;
- un dossier financier par inscription annuelle ;
- une vue famille agrège les dossiers sans les fusionner ;
- les historiques annuels restent séparés ;
- les automatismes importants demandent confirmation ;
- les opérations sensibles sont auditées.

## Résolution tarifaire

Une ligne tarifaire peut viser plusieurs cycles ou plusieurs niveaux.

Priorité :

`niveau > cycle > tout l'établissement`

Deux lignes de même précision ne peuvent pas couvrir le même niveau ou cycle pour le même type de frais, la même grille et la même année.

## Surpaiement

Lorsque le montant reçu dépasse le solde sélectionné, le caissier choisit :

- rendre la monnaie ;
- créer un crédit ;
- annuler la saisie.

La création d'un crédit peut nécessiter une permission spécifique.

## Fratrie

La détection d'un nouvel enfant dans une famille produit une proposition de recalcul. GeeCole n'applique jamais rétroactivement une remise familiale sans validation.
