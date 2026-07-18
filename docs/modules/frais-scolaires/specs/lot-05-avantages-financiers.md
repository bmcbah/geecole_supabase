# Lot 05 — Avantages financiers

**Statut :** en développement

## Objectif

Permettre à un établissement d'accorder une remise, une bourse, une exonération ou une prise en charge à un élève sans modifier la grille tarifaire de référence.

## Principe fondamental

La grille tarifaire reste la vérité. Un avantage financier est un événement auditable appliqué à un frais du dossier financier.

Pour chaque frais, GeeCole conserve :

- le montant initial ;
- le total des avantages actifs ;
- le montant net à payer ;
- le montant déjà encaissé ;
- le solde restant.

Le montant initial n'est jamais écrasé.

## Modèles et attributions

### Modèle d'avantage

Un modèle est configuré par l'établissement et peut être réutilisé :

- Bourse Excellence ;
- Réduction Personnel ;
- Réduction Fratrie ;
- Exonération des frais d'inscription.

Il définit notamment :

- le type métier ;
- le mode de calcul ;
- la valeur par défaut ;
- les catégories de frais éligibles ;
- la portée établissement, cycle ou niveau ;
- le caractère cumulable ou non cumulable.

### Attribution individuelle

Une attribution applique un modèle à un frais précis du dossier d'un élève. La valeur peut être reprise du modèle ou ajustée au moment de la décision.

Chaque attribution conserve le motif, l'auteur, la date et son statut.

## Types d'avantages

- `discount` : remise commerciale ou administrative ;
- `scholarship` : bourse ;
- `exemption` : exonération ;
- `sponsorship` : prise en charge par un tiers.

## Modes de calcul

- `fixed` : montant fixe en GNF ;
- `percentage` : pourcentage du montant initial du frais.

Une exonération complète est représentée par un pourcentage de 100 %.

## Règles de calcul

1. Le montant d'un avantage est calculé sur le montant initial du frais.
2. Le cumul des avantages est plafonné au montant initial.
3. Le montant net ne peut jamais être négatif.
4. Le montant net ne peut jamais être inférieur au montant déjà encaissé sur le frais.
5. Une attribution non cumulable bloque toute autre attribution active sur le même frais.
6. Une attribution n'est jamais supprimée : elle peut être annulée avec un motif.

## Recalcul fixe des échéances

À chaque attribution ou annulation, GeeCole recalcule automatiquement les échéances du frais.

La règle est systématique :

1. les montants déjà encaissés restent intouchables ;
2. les échéances totalement payées conservent leur montant payé ;
3. le nouveau reste à payer du frais est calculé ;
4. ce reste est réparti sur les échéances encore ouvertes selon leur `percentage_snapshot` ;
5. l'écart d'arrondi est affecté à la dernière échéance ouverte ;
6. aucune échéance ne peut avoir un montant inférieur à son montant déjà payé.

Exemple :

- montant initial : 3 000 000 GNF ;
- déjà payé : 600 000 GNF ;
- bourse : 900 000 GNF ;
- nouveau montant net : 2 100 000 GNF ;
- reste à répartir : 1 500 000 GNF.

GeeCole répartit les 1 500 000 GNF sur les échéances encore ouvertes sans modifier les 600 000 GNF déjà encaissés.

## Audit

Toutes les attributions conservent :

- le modèle utilisé ;
- la valeur saisie ;
- le montant calculé ;
- le motif ;
- l'utilisateur ayant accordé l'avantage ;
- la date d'attribution ;
- l'utilisateur et le motif d'annulation éventuelle.

## Périmètre du Lot 5

- modèles d'avantages financiers ;
- attribution individuelle depuis le dossier financier ;
- annulation contrôlée ;
- recalcul transactionnel du frais, du dossier et des échéances ;
- historique des avantages ;
- permissions Supabase ;
- écrans de configuration et d'exploitation.

## Hors périmètre

- remboursement automatique d'un trop-perçu ;
- workflow d'approbation multi-niveaux ;
- signature électronique ;
- justificatif obligatoire ;
- moteur conditionnel avancé de type « si… alors… » ;
- comptabilisation des créances envers les organismes de prise en charge.
