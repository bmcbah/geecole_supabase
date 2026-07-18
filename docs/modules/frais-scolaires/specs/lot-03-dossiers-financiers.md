# Lot 03 — Dossiers financiers

**Statut :** en développement

## Domaine

Le nom officiel du module applicatif est **Gestion financière**.

La configuration des tarifs et des plans reste accessible sous **Frais de scolarité**. Les dossiers annuels sont accessibles sous **Gestion financière**.

## Objet central

Un dossier financier appartient à un établissement, une année scolaire, une inscription et un élève.

Il fige au moment de sa génération :

- l’identité et le matricule de l’élève ;
- le cycle et le niveau ;
- le plan de paiement retenu ;
- les frais applicables avec leur code, libellé et montant ;
- les échéances avec leur ordre, pourcentage, date et montant.

## Génération

La fonction `generate_student_financial_account` :

1. exige une inscription confirmée ;
2. garantit un seul dossier par inscription ;
3. résout chaque tarif avec la priorité niveau > cycle > établissement ;
4. vérifie que le plan actif couvre tous les frais applicables ;
5. crée les snapshots de frais ;
6. répartit le total selon les échéances ;
7. affecte l’écart d’arrondi GNF à la dernière échéance ;
8. retourne le dossier existant lorsqu’elle est rappelée.

## Intégrité

Une modification ultérieure d’une grille tarifaire, d’un type de frais ou d’un plan de paiement ne modifie jamais un dossier déjà généré.

Les frais et les caractéristiques des échéances sont immuables. Les futurs encaissements pourront uniquement faire évoluer les montants payés via des fonctions métier dédiées et journalisées.

## Livrables

- modèle de domaine TypeScript sous `src/modules/financial-management/domain` ;
- tables `student_financial_accounts`, `student_financial_items` et `student_financial_installments` ;
- fonction transactionnelle de génération ;
- service applicatif ;
- page annuelle **Dossiers financiers** ;
- action manuelle de génération ;
- groupe principal **Gestion financière** dans le menu ;
- route `/gestion-financiere/dossiers`.

## Hors périmètre

- encaissements et reçus ;
- remises, bourses et pénalités ;
- relances ;
- régénération destructive d’un dossier actif.
