# Lot 03 — Dossiers financiers

**Statut :** implémenté

## Domaine

Le nom officiel du module applicatif est **Gestion financière**.

Les catégories de frais sont des référentiels permanents de l’établissement et sont accessibles dans **Paramétrage > Catégories de frais**.

La configuration annuelle reste dans **Gestion financière > Configuration** :

- grille tarifaire ;
- plans de paiement.

## Objet central

Un dossier financier appartient à un établissement, une année scolaire, une inscription et un élève.

Il fige au moment de sa génération :

- l’identité et le matricule de l’élève ;
- le cycle et le niveau ;
- les frais applicables avec leur code, libellé et montant ;
- pour chaque frais, le plan de paiement résolu ;
- pour chaque frais, ses propres échéances avec leur ordre, pourcentage, date et montant.

Le plan de paiement n’est pas porté par le dossier global. Chaque ligne de frais possède son plan et son échéancier.

## Génération

Le frontend appelle uniquement :

```sql
generate_student_financial_account(target_enrollment_id uuid)
```

La fonction :

1. exige une inscription confirmée ;
2. garantit un seul dossier par inscription ;
3. résout chaque tarif avec la priorité niveau > cycle > établissement ;
4. résout, pour chaque frais, le plan applicable avec la même priorité ;
5. refuse une ambiguïté de même priorité ;
6. crée les snapshots du frais et du plan ;
7. génère les échéances du frais indépendamment des autres frais ;
8. affecte l’écart d’arrondi GNF à la dernière échéance du frais ;
9. retourne le dossier existant lorsqu’elle est rappelée.

## Erreurs métier

- `missing_payment_plan_for_fee_type:<libellé>` ;
- `duplicate_payment_plan_for_fee_type:<libellé>` ;
- `invalid_payment_plan_installments:<plan>` ;
- `no_applicable_fees`.

L’ancienne erreur `payment_plan_does_not_cover_all_fees` n’est plus utilisée.

## Intégrité

Une modification ultérieure d’une grille tarifaire, d’une catégorie de frais ou d’un plan de paiement ne modifie jamais un dossier déjà généré.

Les frais, les plans résolus et les caractéristiques des échéances sont immuables. Seuls les montants payés évoluent via des fonctions métier dédiées et journalisées.

## Livrables

- modèle de domaine TypeScript sous `src/modules/financial-management/domain` ;
- tables `student_financial_accounts`, `student_financial_items` et `student_financial_installments` ;
- fonction transactionnelle et idempotente de génération ;
- service applicatif ;
- page annuelle **Dossiers financiers** ;
- action manuelle de génération sans sélection de plan ;
- groupe principal **Gestion financière** ;
- route `/gestion-financiere/dossiers`.

## Hors périmètre

- remises, bourses et exonérations ;
- pénalités automatiques ;
- relances ;
- régénération destructive d’un dossier actif.
