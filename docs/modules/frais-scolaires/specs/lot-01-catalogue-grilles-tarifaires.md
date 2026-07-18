# Lot 01 — Catalogue des frais et grilles tarifaires annuelles

**Statut :** spécifié

## Objectif

Permettre à un établissement de définir simplement ce qu'il facture pendant une année scolaire et à quels cycles ou niveaux chaque montant s'applique.

## Dépendances

- établissement actif ;
- année scolaire sélectionnée ;
- cycles et niveaux configurés pour cette année ;
- permissions d'administration des frais.

## Périmètre

- types de frais permanents au niveau établissement ;
- grille tarifaire annuelle unique en V1 ;
- lignes tarifaires ;
- ciblage établissement, cycles ou niveaux ;
- résolution du tarif applicable ;
- détection des conflits ;
- duplication simple vers une nouvelle année ;
- archivage et consultation historique ;
- tableau filtrable par frais, cycle, niveau et statut.

## Hors périmètre

- plans de paiement ;
- remises ;
- création des dossiers financiers ;
- encaissements ;
- caractère obligatoire/facultatif ;
- dates de début ou de fin d'une ligne dans l'année ;
- recalcul automatique des dossiers existants ;
- vue matricielle de couverture ;
- augmentation globale ou modification en masse pendant la duplication.

## Modèle métier

### Type de frais

Identité permanente et réutilisable au niveau de l'établissement : nom, code, description, catégorie et statut actif/archivé.

La gestion des types pourra être enrichie ultérieurement. Dans le Lot 1, un tarif configuré s'applique à tout le périmètre qu'il cible, sans distinction obligatoire/facultatif.

### Grille tarifaire

Une grille appartient à un établissement et une année scolaire. Une seule grille principale est autorisée par établissement et année scolaire dans la V1.

### Ligne tarifaire

Champs fonctionnels :

- type de frais ;
- montant entier en GNF ;
- mode de portée : `school`, `cycles` ou `levels` ;
- cycles ciblés, si portée cycles ;
- niveaux ciblés, si portée niveaux ;
- statut ;
- note interne facultative.

Une ligne peut cibler plusieurs cycles ou plusieurs niveaux, mais jamais les deux simultanément.

Une ligne appartient à l'année scolaire complète. Elle ne possède pas de date de début ou de fin dans le Lot 1.

## Résolution

Pour une inscription donnée :

1. rechercher une ligne visant précisément son niveau ;
2. sinon rechercher une ligne visant son cycle ;
3. sinon rechercher la ligne visant tout l'établissement ;
4. sinon considérer le frais comme non configuré pour ce périmètre.

Priorité : `niveau > cycle > établissement`.

## Conflits interdits

Pour un même établissement, une même année, une même grille et un même type de frais :

- deux lignes niveau ne peuvent pas contenir le même niveau ;
- deux lignes cycle ne peuvent pas contenir le même cycle ;
- une seule ligne établissement est autorisée ;
- une ligne niveau et une ligne cycle peuvent coexister : le niveau constitue une exception ;
- une ligne cycle et une ligne établissement peuvent coexister : le cycle constitue une exception.

L'interface doit expliquer le conflit et proposer de modifier la ligne existante ou de retirer les éléments en doublon.

## Parcours principal

1. L'utilisateur ouvre Frais scolaires > Configuration > Grille tarifaire.
2. La grille de l'année sélectionnée est affichée.
3. Il choisit « Ajouter un tarif ».
4. Il sélectionne le type de frais.
5. Il choisit le périmètre : établissement, cycles ou niveaux.
6. Il sélectionne plusieurs cycles/niveaux si nécessaire.
7. Il saisit le montant.
8. GeeCole prévisualise le résumé et contrôle les chevauchements.
9. L'utilisateur enregistre.
10. Il retrouve et vérifie la ligne avec les filtres du tableau.

Le formulaire doit rester guidé et ne montrer les sélecteurs que lorsque leur portée est choisie.

Le parcours UX détaillé est défini dans `lot-01-parcours-ux.md`.

## Affichage recommandé

Tableau de l'année sélectionnée avec :

- frais ;
- périmètre résumé ;
- montant ;
- statut ;
- actions.

Filtres :

- type de frais ;
- cycle ;
- niveau ;
- statut.

Exemples de libellés :

- `Inscription — Tout l'établissement — 110 000 GNF` ;
- `Scolarité — 1re à 5e année — 1 000 000 GNF` ;
- `Scolarité — 7e, 8e et 9e année — 2 000 000 GNF`.

Le résumé visuel ne doit jamais remplacer la liste exacte enregistrée.

## Modification d'une ligne utilisée

Une ligne déjà utilisée par un dossier financier reste modifiable.

La modification s'applique uniquement aux futurs dossiers financiers. Les frais déjà appliqués sont figés et aucun recalcul automatique n'est effectué.

L'interface doit avertir l'utilisateur avant validation.

## Duplication annuelle

Depuis une année en préparation, l'utilisateur peut :

- partir d'une grille vide ;
- dupliquer la grille d'une année antérieure.

La duplication copie les lignes, périmètres et montants dans la nouvelle année sans modifier la source. Chaque copie conserve son origine.

Aucune augmentation globale, aucun pourcentage et aucune modification en masse ne sont prévus dans le Lot 1.

## Données proposées

- `fee_types` ;
- `fee_schedules` ;
- `fee_schedule_items` ;
- `fee_schedule_item_cycles` ;
- `fee_schedule_item_levels`.

Les types de frais portent `school_id` mais ne sont pas liés à une année scolaire.

Toutes les tables annuelles portent au minimum `school_id` et `academic_year_id`. Les contraintes doivent garantir la cohérence du mode de portée et empêcher les doublons de même précision.

## Permissions

À confirmer avec la matrice globale des rôles :

- consulter la grille ;
- créer/modifier une grille en préparation ou active ;
- archiver une ligne ;
- dupliquer une grille ;
- modifier exceptionnellement une année clôturée.

Toute modification est auditée.

## RLS

- accès limité aux établissements autorisés ;
- accès aux années autorisées ;
- écriture interdite sur année archivée ;
- écriture sur année clôturée réservée à une permission exceptionnelle.

## Critères d'acceptation

- créer et archiver un type de frais permanent ;
- réutiliser un type de frais sur plusieurs années ;
- garantir une seule grille principale par année ;
- définir un tarif pour tout l'établissement ;
- sélectionner plusieurs cycles ;
- sélectionner plusieurs niveaux ;
- filtrer les lignes par frais, cycle, niveau et statut ;
- afficher le tarif applicable à un niveau ;
- appliquer correctement la priorité niveau > cycle > établissement ;
- bloquer un chevauchement de même précision ;
- autoriser une exception de niveau dans un cycle ;
- modifier une ligne utilisée sans changer les dossiers existants ;
- ne déclencher aucun recalcul automatique ;
- dupliquer une grille vers une nouvelle année sans traitement en masse ;
- garantir que la modification d'une nouvelle grille ne change pas l'ancienne ;
- archiver une ligne sans perdre son historique.

## Points restant à préciser pendant la conception technique

Ces points ne remettent pas en cause le parcours métier validé :

1. noms définitifs des permissions et rôles autorisés ;
2. détail des contraintes SQL et de la stratégie de détection préventive des conflits ;
3. comportement précis lorsqu'un type de frais archivé est encore référencé par une ancienne grille ;
4. contenu exact de l'audit et des messages d'erreur techniques.
