# Lot 04 — Encaissements

**Statut :** implémenté, prêt à fusionner

## Objectif

Enregistrer les paiements reçus depuis le dossier financier d’un élève, les affecter aux échéances choisies et conserver une piste d’audit complète.

## Parcours utilisateur

Le caissier ouvre un dossier financier puis clique sur **Encaisser**.

1. il choisit une catégorie de frais présente dans le dossier : préinscription, inscription, scolarité, transport, examen ou autre ;
2. GeeCole affiche uniquement le plan et les échéances du frais sélectionné ;
3. chaque ligne montre le montant demandé, le montant déjà payé, le solde et un champ de saisie ;
4. le caissier saisit librement un paiement partiel ou utilise **Solder ce frais** ;
5. le paiement est enregistré avec son mode, sa date, sa référence et sa note éventuelle.

Un frais payé en une seule fois affiche une seule ligne. Un frais mensualisé affiche uniquement ses mensualités.

## Règles métier

- un encaissement appartient à un dossier financier annuel ;
- son montant doit être strictement positif ;
- la somme des ventilations doit être égale au montant encaissé ;
- chaque ventilation cible une échéance du dossier sélectionné ;
- une ventilation ne peut pas dépasser le solde de l’échéance ;
- les paiements partiels sont toujours autorisés ;
- chaque encaissement reçoit un numéro de reçu unique ;
- un encaissement comptabilisé n’est jamais supprimé ;
- son annulation exige un motif et restaure les échéances ainsi que le solde du dossier ;
- seuls les propriétaires et administrateurs peuvent annuler un encaissement ;
- les propriétaires, administrateurs et secrétaires peuvent enregistrer un encaissement.

## Allocation

La modal envoie des ventilations explicites sous la forme :

```text
échéance A → montant X
échéance B → montant Y
```

Le backend contrôle transactionnellement l’appartenance des échéances, leur solde et la somme totale avant de mettre à jour les montants payés.

La ventilation FIFO globale n’est plus utilisée dans ce parcours.

## Modes de paiement

- espèces ;
- carte ;
- virement bancaire ;
- Mobile Money ;
- chèque ;
- autre.

## Livrables

- tables `financial_payments` et `financial_payment_allocations` ;
- RPC `register_financial_payment` avec ventilations ciblées ;
- RPC `cancel_financial_payment` ;
- génération séquentielle des numéros de reçu ;
- synchronisation du payé, du solde et du statut du dossier ;
- encaissement directement depuis **Dossiers financiers** ;
- sélection du frais avant affichage des échéances ;
- historique des encaissements ;
- consultation du reçu ;
- annulation contrôlée avec motif obligatoire.

## Organisation des menus

### Paramétrage

- Catégories de frais.

### Gestion financière > Configuration

- Grille tarifaire ;
- Plans de paiement.

### Gestion financière > Opérations

- Dossiers financiers ;
- Historique des encaissements.

## Migrations principales

- `20260718194500_create_financial_payments.sql` ;
- `20260718200000_cancel_financial_payment.sql` ;
- `20260718210000_resolve_payment_plan_per_fee.sql` ;
- `20260718213000_register_targeted_financial_payment.sql`.

## Recette avant fusion

- générer un dossier comportant plusieurs catégories de frais ;
- vérifier qu’un plan différent peut être résolu pour chaque frais ;
- encaisser partiellement un frais à paiement unique ;
- encaisser une ou plusieurs échéances de scolarité ;
- vérifier qu’une échéance soldée n’accepte plus de montant ;
- vérifier le total payé et le solde du dossier ;
- annuler un encaissement avec un compte administrateur ;
- vérifier la restauration des échéances ;
- vérifier les routes et menus après déplacement des catégories de frais.

## Hors périmètre

- impression PDF réglementaire ;
- clôture journalière de caisse ;
- rapprochement bancaire ;
- remboursement bancaire automatisé ;
- comptabilité générale.
