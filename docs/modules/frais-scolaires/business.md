# Module Frais scolaires

## Finalité

Le module Frais scolaires couvre la gestion des créances liées à la scolarité : ce que l'établissement facture, ce que l'élève doit, ce qui a été encaissé et ce qui reste à payer.

Le terme « Finance » n'est pas utilisé pour la V1 afin de ne pas créer une attente de comptabilité complète.

## Périmètre V1

- types de frais ;
- grilles tarifaires annuelles ;
- plans de paiement ;
- dossiers financiers par inscription ;
- avantages tarifaires ;
- échéances ;
- encaissements ;
- affectations ;
- crédits ;
- reçus ;
- annulations ;
- impayés ;
- vue familiale agrégée.

## Hors périmètre V1

- comptabilité générale ;
- dépenses ;
- paie ;
- banque et rapprochement ;
- trésorerie avancée ;
- intégration automatique Mobile Money ;
- portail parent ;
- moteur de règles libre.

## Dépendances

### Paramétrage

Fournit l'établissement, les années scolaires, les cycles, les niveaux, les classes, les utilisateurs et les permissions.

### Scolarité

Fournit les élèves, familles, responsables, inscriptions, réinscriptions et événements de changement de parcours.

La famille reste un sous-domaine de Scolarité. Frais scolaires la consulte sans en devenir propriétaire.

## Principe d'intégration

La scolarité produit des événements métier. Frais scolaires y réagit.

Exemple :

`Inscription validée → dossier financier → frais appliqués → avantages → échéances → prêt à encaisser`

## Agrégats métier

1. **Catalogue annuel** : types de frais utilisés, grille tarifaire, plans et avantages.
2. **Dossier financier** : situation d'une inscription pour une année scolaire.
3. **Encaissement** : paiement reçu, affectations, reçu et éventuelle annulation.
4. **Pilotage** : échéances, impayés, journal et vues agrégées.

## Documents

- [Domaine métier](./domaine-metier.md)
- [Décisions](./decisions.md)
- [Roadmap](./roadmap.md)
- [Spécifications](./specs/README.md)


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


# Registre des décisions — Frais scolaires

## DEC-001 — Nom du module

**Décision :** utiliser « Frais scolaires » en V1 plutôt que « Finance ».

**Raison :** le périmètre ne couvre pas la comptabilité, les dépenses ou la trésorerie complète.

## DEC-002 — Dossier par inscription

**Décision :** chaque inscription annuelle possède son propre dossier financier.

La vue famille agrège les dossiers des enfants sans les remplacer ni fusionner les soldes.

## DEC-003 — Création du dossier

**Décision :** créer le dossier financier immédiatement après validation de l'inscription.

## DEC-004 — Plans de paiement

**Décision :** l'établissement configure les plans autorisés et le plan applicable est choisi pendant l'inscription.

## DEC-005 — Avantages tarifaires

**Décision :** utiliser un moteur commun d'avantages pour la fratrie, les bourses, le personnel, les conventions et les réductions exceptionnelles.

## DEC-006 — Nouvelle fratrie

**Décision :** lorsqu'un nouvel enfant est détecté, GeeCole propose un recalcul. Aucune modification rétroactive automatique.

## DEC-007 — Surpaiement

**Décision :** proposer au caissier de rendre la monnaie, créer un crédit ou annuler.

## DEC-008 — Paramétrage intuitif

**Décision :** ne pas exposer de moteur de règles générique en V1. Utiliser des formulaires guidés et réserver les exceptions rares aux paramètres avancés.

## DEC-009 — Contexte annuel

**Décision :** toute opération se déroule dans un établissement et une année scolaire sélectionnée.

## DEC-010 — Nature des données

**Décision :** distinguer données permanentes, structures annuelles et opérations annuelles. Les élèves, familles et responsables sont permanents ; les inscriptions et dossiers financiers sont annuels.

## DEC-011 — États des années

**Décision :** prévoir les états préparation, active, clôturée et archivée. Un établissement ne possède qu'une année active, mais peut préparer la suivante.

## DEC-012 — Historique des dettes

**Décision :** afficher séparément le solde courant et les dettes antérieures. Ne jamais les fusionner silencieusement.

## DEC-013 — Grilles tarifaires annuelles

**Décision :** les tarifs appartiennent à une année scolaire et peuvent changer chaque année.

## DEC-014 — Périmètre d'une ligne tarifaire

**Décision :** une ligne s'applique soit à tout l'établissement, soit à plusieurs cycles, soit à plusieurs niveaux.

## DEC-015 — Priorité tarifaire

**Décision :** niveau > cycle > établissement. Les chevauchements de même précision sont interdits.

## DEC-016 — Traçabilité

**Décision :** un paiement validé n'est pas supprimé. Toute annulation ou correction conserve l'auteur, la date, le motif et la relation avec l'opération d'origine.

## DEC-017 — Types de frais permanents

**Décision :** les types de frais sont permanents au niveau de l'établissement et sont réutilisables d'une année scolaire à l'autre.

Leur gestion peut être enrichie ultérieurement sans remettre en cause les grilles annuelles.

## DEC-018 — Applicabilité des tarifs en V1

**Décision :** le Lot 1 ne gère pas de distinction obligatoire/facultatif.

Tout tarif configuré s'applique au périmètre établissement, cycles ou niveaux qu'il cible. Une gestion plus fine de l'applicabilité est reportée.

## DEC-019 — Grille unique annuelle

**Décision :** un établissement possède une seule grille tarifaire principale par année scolaire dans la V1.

## DEC-020 — Modification d'un tarif utilisé

**Décision :** une ligne tarifaire déjà utilisée peut être modifiée, mais la modification ne concerne que les futurs dossiers financiers.

Les montants déjà appliqués restent figés.

## DEC-021 — Absence de recalcul automatique

**Décision :** aucun dossier financier existant n'est recalculé automatiquement après une modification de grille.

## DEC-022 — Validité sur toute l'année

**Décision :** une ligne tarifaire ne possède pas de date de début ou de fin dans le Lot 1. Elle appartient à l'année scolaire complète.

## DEC-023 — Contrôle par filtres

**Décision :** aucune vue matricielle de couverture n'est ajoutée dans le Lot 1.

Le contrôle et la recherche se font depuis le tableau de la grille avec des filtres par frais, cycle, niveau et statut.

## DEC-024 — Duplication simple

**Décision :** la duplication annuelle copie les tarifs sans augmentation globale, pourcentage ni modification en masse dans le Lot 1.
