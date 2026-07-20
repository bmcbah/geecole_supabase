# Lot 01 — Parcours UI/UX

**Statut :** validé

Ce document décrit le parcours utilisateur retenu pour le catalogue des frais et les grilles tarifaires annuelles.

## Principes

- l'établissement et l'année scolaire viennent du contexte global GeeCole ;
- l'utilisateur ne choisit pas de nouveau l'année dans chaque formulaire ;
- les écrans restent guidés et n'exposent pas un moteur de règles ;
- une seule grille principale existe par établissement et année scolaire en V1 ;
- la configuration porte sur les futurs dossiers financiers et ne recalcule jamais automatiquement les dossiers existants.

## Navigation

```text
Frais scolaires
└── Configuration
    ├── Grille tarifaire
    └── Types de frais
```

Le bandeau global affiche en permanence :

- l'établissement actif ;
- l'année scolaire sélectionnée ;
- l'état de l'année : préparation, active, clôturée ou archivée.

## Écran Grille tarifaire

### En-tête

- titre : `Grille tarifaire` ;
- sous-titre : `Configurez les frais applicables pour l'année sélectionnée.` ;
- action principale : `Ajouter un tarif` ;
- action secondaire : `Dupliquer une grille`.

### Tableau

Colonnes :

- frais ;
- périmètre ;
- montant ;
- statut ;
- actions.

Exemples :

- `Inscription — Tout l'établissement — 110 000 GNF` ;
- `Scolarité — 1re à 5e année — 1 000 000 GNF` ;
- `Scolarité — 7e, 8e et 9e année — 2 000 000 GNF`.

### Filtres

La vérification de la couverture se fait directement dans le tableau avec les filtres :

- type de frais ;
- cycle ;
- niveau ;
- statut.

Aucune vue matricielle de couverture n'est prévue dans le Lot 1.

### État vide

Message : `Aucun tarif n'a encore été défini pour cette année scolaire.`

Actions :

- `Ajouter un premier tarif` ;
- `Dupliquer une année précédente`.

## Ajouter ou modifier un tarif

Le formulaire s'ouvre dans un panneau latéral et reste sur une seule vue guidée.

### 1. Type de frais

L'utilisateur sélectionne un type existant.

Un lien `Créer un nouveau type de frais` ouvre un formulaire court séparé.

### 2. Périmètre

Choix unique :

- tout l'établissement ;
- un ou plusieurs cycles ;
- un ou plusieurs niveaux.

### 3. Sélection

Le sélecteur apparaît uniquement pour une portée cycle ou niveau.

Pour les niveaux, les choix sont regroupés par cycle. Une action permet de sélectionner tous les niveaux d'un cycle.

Une ligne peut sélectionner plusieurs cycles ou plusieurs niveaux, jamais les deux.

### 4. Montant

- montant entier en GNF ;
- formatage lisible pendant la saisie ;
- aucun calcul de pourcentage ou augmentation globale dans le Lot 1.

### 5. Résumé et validation

Avant enregistrement, GeeCole affiche :

- le type de frais ;
- le périmètre exact ;
- le montant ;
- l'année scolaire concernée.

GeeCole contrôle les chevauchements avant la validation.

## Gestion des conflits

Pour un chevauchement de même précision, le message indique les cycles ou niveaux déjà couverts et présente la ligne existante.

Actions proposées :

- modifier le tarif existant ;
- retirer les éléments en doublon de la sélection ;
- annuler.

Une exception de niveau sur un tarif de cycle reste autorisée. Une exception de cycle sur le tarif établissement reste autorisée.

## Modification d'un tarif utilisé

Une ligne déjà utilisée par des dossiers financiers peut être modifiée.

L'interface affiche un avertissement :

> Ce tarif a déjà été utilisé. Les dossiers existants conserveront leur montant. La modification s'appliquera uniquement aux futurs dossiers financiers.

Aucun recalcul automatique n'est proposé.

## Archivage

L'action utilisateur est `Archiver`, jamais `Supprimer`.

L'archivage :

- empêche l'utilisation du tarif pour les futurs dossiers ;
- ne modifie pas les dossiers existants ;
- conserve l'historique et l'audit.

## Types de frais

Les types de frais sont permanents au niveau de l'établissement et peuvent être réutilisés d'une année à l'autre.

Le Lot 1 permet une gestion simple :

- nom ;
- code ;
- description facultative ;
- catégorie ;
- statut actif/archivé.

La notion obligatoire/facultatif n'est pas gérée dans le Lot 1. Tout tarif configuré s'applique au périmètre qu'il cible. Une éventuelle gestion plus fine des types ou de l'applicabilité sera étudiée dans un lot ultérieur.

## Duplication annuelle

Depuis une année en préparation, l'utilisateur choisit une année source et duplique :

- les types de frais utilisés ;
- les lignes tarifaires ;
- les périmètres ;
- les montants.

La source reste inchangée et chaque copie conserve son origine.

Aucune augmentation globale ni modification en masse n'est incluse dans le Lot 1.

## États de l'année

### Préparation

Création, modification, duplication et archivage autorisés selon permissions.

### Active

Création et modification autorisées selon permissions, avec avertissement pour les lignes déjà utilisées.

### Clôturée

Lecture seule par défaut. Les exceptions relèvent d'une permission élevée et sont auditées.

### Archivée

Lecture seule stricte.

## Parcours résumé

```text
Contexte établissement + année
        ↓
Frais scolaires
        ↓
Configuration
        ↓
Grille tarifaire
        ↓
Ajouter un tarif
        ↓
Choisir le frais
        ↓
Choisir le périmètre
        ↓
Sélectionner cycles ou niveaux
        ↓
Saisir le montant
        ↓
Contrôler les conflits
        ↓
Enregistrer
        ↓
Retrouver et vérifier avec les filtres
```


## Paiement à l’inscription

Le stepper adapte son parcours à la politique : sans paiement, acompte, paiement total ou paiement facultatif. Le backend applique la même règle.
