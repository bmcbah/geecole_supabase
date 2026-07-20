# Organisation scolaire — Décisions métier validées

Ce document consigne uniquement les décisions fonctionnelles validées pour l'organisation scolaire.

## ORG-001 — Catalogue des cycles

GeeCole fournit un catalogue prédéfini de cycles adapté au système éducatif guinéen.

L'établissement active les cycles qu'il utilise au lieu de les recréer manuellement.

Le système doit également permettre l'ajout de cycles personnalisés lorsque le catalogue standard ne suffit pas.

## ORG-002 — Catalogue des niveaux

GeeCole fournit un catalogue prédéfini de niveaux.

Les niveaux sont déjà rattachés à leur cycle de référence. L'établissement active uniquement les niveaux qu'il utilise.

Le système doit permettre l'ajout de niveaux personnalisés lorsque nécessaire.

## ORG-003 — Catalogue des matières

GeeCole fournit un catalogue prédéfini de matières couvrant les matières couramment utilisées dans les établissements guinéens.

L'établissement active les matières dont il a besoin au lieu de les recréer manuellement.

Le système doit permettre l'ajout de matières personnalisées.

## ORG-004 — Activation par panneaux de configuration

Les catalogues de cycles, niveaux et matières sont présentés dans des panneaux de configuration permettant une activation simple par cases à cocher.

Les vues existantes doivent être utilisées et adaptées à ce fonctionnement plutôt que remplacées sans nécessité.

## ORG-005 — Affectation des matières aux niveaux

Une matière activée est affectée à un ou plusieurs niveaux.

Les matières ne sont pas affectées directement aux classes dans le fonctionnement standard.

## ORG-006 — Héritage des matières par les classes

Chaque classe hérite automatiquement des matières affectées à son niveau.

Le modèle fonctionnel est donc :

Catalogue des cycles → catalogue des niveaux → catalogue des matières → affectation des matières aux niveaux → héritage par les classes.

Les éventuelles dérogations ou options propres à une classe devront être traitées comme des cas particuliers lors d'un cadrage ultérieur.
