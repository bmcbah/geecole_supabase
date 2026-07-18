# Lot 01 — Catalogue des frais et grilles tarifaires annuelles

**Statut :** à spécifier

## Objectif

Permettre à un établissement de définir simplement ce qu'il facture pendant une année scolaire et à quels cycles ou niveaux chaque montant s'applique.

## Dépendances

- établissement actif ;
- année scolaire sélectionnée ;
- cycles et niveaux configurés pour cette année ;
- permissions d'administration des frais.

## Périmètre

- types de frais ;
- grille tarifaire annuelle ;
- lignes tarifaires ;
- ciblage établissement, cycles ou niveaux ;
- résolution du tarif applicable ;
- détection des conflits ;
- duplication vers une nouvelle année ;
- archivage et consultation historique.

## Hors périmètre

- plans de paiement ;
- remises ;
- création des dossiers financiers ;
- encaissements.

## Modèle métier

### Type de frais

Identité réutilisable : nom, code, description, catégorie, caractère obligatoire/facultatif et statut.

Questions à valider : le caractère obligatoire est-il annuel ou porté par la ligne tarifaire ? Les types génériques sont-ils permanents ou dupliqués comme configuration annuelle ?

### Grille tarifaire

Une grille appartient à un établissement et une année scolaire. Une seule grille principale active est recommandée par année dans la V1.

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

1. L'utilisateur ouvre Frais scolaires > Configuration > Grilles tarifaires.
2. La grille de l'année sélectionnée est affichée.
3. Il choisit « Ajouter un tarif ».
4. Il sélectionne le type de frais.
5. Il choisit le périmètre : établissement, cycles ou niveaux.
6. Il sélectionne plusieurs cycles/niveaux si nécessaire.
7. Il saisit le montant.
8. GeeCole prévisualise le résumé et contrôle les chevauchements.
9. L'utilisateur enregistre.

Le formulaire doit rester guidé et ne montrer les sélecteurs que lorsque leur portée est choisie.

## Affichage recommandé

Tableau par année avec :

- frais ;
- périmètre résumé ;
- montant ;
- statut ;
- actions.

Exemples de libellés :

- `Inscription — Tout l'établissement — 110 000 GNF` ;
- `Scolarité — 1re à 5e année — 1 000 000 GNF` ;
- `Scolarité — 7e, 8e et 9e année — 2 000 000 GNF`.

Le résumé visuel ne doit jamais remplacer la liste exacte enregistrée.

## Duplication annuelle

Depuis une année en préparation, l'utilisateur peut :

- partir d'une grille vide ;
- dupliquer la grille d'une année antérieure.

La duplication copie les lignes, périmètres et montants dans la nouvelle année sans modifier la source. Chaque copie conserve son origine.

Question ouverte : proposer ou non une augmentation globale en pourcentage pendant la duplication. Recommandation initiale : reporter cette option après validation du parcours simple.

## Données proposées

- `fee_types` ;
- `fee_schedules` ;
- `fee_schedule_items` ;
- `fee_schedule_item_cycles` ;
- `fee_schedule_item_levels`.

Toutes les tables annuelles portent au minimum `school_id` et `academic_year_id`. Les contraintes doivent garantir la cohérence du mode de portée et empêcher les doublons de même précision.

## Permissions

À confirmer avec la matrice globale :

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

## Critères d'acceptation initiaux

- créer un type de frais ;
- définir un tarif pour tout l'établissement ;
- sélectionner plusieurs cycles ;
- sélectionner plusieurs niveaux ;
- afficher le tarif applicable à un niveau ;
- appliquer correctement la priorité niveau > cycle > établissement ;
- bloquer un chevauchement de même précision ;
- autoriser une exception de niveau dans un cycle ;
- dupliquer une grille vers une nouvelle année ;
- garantir que la modification d'une nouvelle grille ne change pas l'ancienne ;
- archiver une ligne sans perdre son historique.

## Questions ouvertes à traiter avant développement

1. Le type de frais est-il permanent avec activation annuelle, ou entièrement annuel ?
2. Une seule grille active par année suffit-elle en V1 ?
3. Le caractère obligatoire/facultatif appartient-il au type ou à la ligne annuelle ?
4. Une ligne tarifaire possède-t-elle une date de début/fin dans l'année, ou toute variation en cours d'année passe-t-elle par une version explicite ?
5. Peut-on modifier une ligne déjà utilisée par un dossier financier, sachant que les frais appliqués sont figés ?
6. Quels rôles peuvent modifier ou dupliquer une grille ?
7. Faut-il une prévisualisation matricielle par cycle/niveau avant validation ?
