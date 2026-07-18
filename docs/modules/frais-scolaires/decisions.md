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
