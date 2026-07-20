# Lot 02 — Plans de paiement

**Statut :** en développement

## Objectif

Permettre à un établissement de configurer, pour une année scolaire, des modèles d’échéancier applicables aux frais scolaires avant la création des dossiers financiers élèves.

## Dépendances

- Lot 01 validé ;
- année scolaire et calendrier disponibles ;
- catalogue des frais et grille tarifaire disponibles.

## Périmètre

Un plan de paiement :

- appartient à un établissement et à une année scolaire ;
- possède un nom, un code et un type de présentation ;
- cible un ou plusieurs types de frais actifs ;
- s’applique à tout l’établissement, à plusieurs cycles ou à plusieurs niveaux ;
- contient une ou plusieurs échéances ordonnées ;
- répartit 100 % du montant concerné entre ses échéances.

Types proposés :

- comptant ;
- tranches ;
- mensualités ;
- personnalisé.

Le type facilite la lecture et la création du plan. Les échéances enregistrées restent la source de vérité.

## Hors périmètre

- création du dossier financier d’un élève ;
- calcul et gel d’un montant monétaire par élève ;
- remises et avantages ;
- paiements, reçus et soldes ;
- modification automatique des dossiers déjà générés.

Ces éléments commencent au Lot 03.

## Règles métier

1. Le total des pourcentages d’un plan doit être égal à 100 % avant enregistrement.
2. Une échéance contient un libellé, un ordre, un pourcentage et une date d’échéance.
3. La portée fonctionne comme pour les grilles tarifaires : établissement, cycles ou niveaux.
4. Les cibles incompatibles sont vidées lorsqu’on change de portée.
5. Un plan peut cibler plusieurs types de frais.
6. Une modification ne s’applique qu’aux futurs dossiers financiers.
7. Une année clôturée ou archivée est en lecture seule.
8. Un plan peut être désactivé sans être supprimé.
9. Les arrondis monétaires seront appliqués au Lot 03 lors de la génération d’un dossier réel ; l’échéance finale absorbera l’écart.

## Parcours de configuration

Navigation :

`Paramétrage > Frais scolaires > Plans de paiement`

L’écran affiche :

- la liste des plans de l’année active ;
- le type, la portée, les frais concernés et le nombre d’échéances ;
- un formulaire de création ou modification ;
- une prévisualisation des échéances et du total ;
- une alerte lorsque le total diffère de 100 %.

## Modèle de données

### payment_plans

Modèle annuel contenant l’identité, le type, la portée et les frais concernés.

### payment_plan_installments

Échéances ordonnées contenant le pourcentage et la date d’exigibilité.

## Critères d’acceptation

- créer un plan comptant à 100 % ;
- créer un plan en plusieurs tranches ;
- ajouter et retirer des échéances ;
- empêcher l’enregistrement si le total n’est pas égal à 100 % ;
- adapter les champs de cible à la portée ;
- afficher uniquement les plans de l’année scolaire active ;
- rendre une année clôturée ou archivée non modifiable ;
- conserver les plans des années précédentes.
