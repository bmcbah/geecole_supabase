# Lot 04 — Encaissements

**Statut :** implémenté sur la branche du Lot 4

## Objectif

Enregistrer les paiements reçus pour un dossier financier, les ventiler automatiquement sur les échéances ouvertes et conserver une piste d’audit complète.

## Règles métier

- un encaissement appartient à un dossier financier annuel ;
- son montant doit être strictement positif et ne peut pas dépasser le solde du dossier ;
- la ventilation s’effectue sur les échéances les plus anciennes, triées par date puis par ordre ;
- chaque encaissement reçoit un numéro de reçu unique ;
- un encaissement comptabilisé n’est jamais supprimé ;
- son annulation exige un motif et restaure les échéances ainsi que le solde du dossier ;
- seuls les propriétaires et administrateurs peuvent annuler un encaissement ;
- les propriétaires, administrateurs et secrétaires peuvent enregistrer un encaissement.

## Modes de paiement

- espèces ;
- carte ;
- virement bancaire ;
- Mobile Money ;
- chèque ;
- autre.

## Livrables

- tables `financial_payments` et `financial_payment_allocations` ;
- RPC `register_financial_payment` ;
- RPC `cancel_financial_payment` ;
- génération séquentielle des numéros de reçu ;
- synchronisation du payé, du solde et du statut du dossier ;
- page **Encaissements** ;
- formulaire de saisie ;
- consultation du reçu ;
- annulation contrôlée avec motif obligatoire.

## Hors périmètre

- impression PDF réglementaire ;
- clôture journalière de caisse ;
- rapprochement bancaire ;
- remboursement bancaire automatisé ;
- comptabilité générale.
