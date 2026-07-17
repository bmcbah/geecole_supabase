# Paramétrage — Spécifications métier

## Mission

Adapter GeeCole à chaque établissement sans valeur pédagogique codée dans le frontend.

## Règles structurantes

- Une année scolaire suit strictement les états `preparation → open → closed → archived`.
- Un établissement possède au plus une seule année scolaire `open`.
- Plusieurs années peuvent être en préparation, clôturées ou archivées.
- Une année en préparation ou en cours reste modifiable.
- Une année clôturée ou archivée est en lecture seule.
- Les configurations sont rattachées à l'année sélectionnée.
- Le catalogue des cycles est fixe et piloté par la base.
- L'activation d'un cycle est annuelle : deux années d'un même établissement peuvent proposer des cycles différents.
- L'activation ouvre immédiatement la configuration du cycle ; celle-ci peut être modifiée tant que l'année n'est pas clôturée.
- La désactivation supprime l'instance annuelle d'un cycle uniquement lorsqu'elle ne contient aucun niveau.
- Un cycle annuel contenant des niveaux ou des données dépendantes ne peut pas être désactivé.
- Les niveaux appartiennent à un cycle actif pour l'année sélectionnée.
- Les noms peuvent se répéter ; les codes sont uniques dans leur portée annuelle.
- Une inscription ou une donnée historisée n'est jamais supprimée physiquement.
- Le clonage copie les cycles, niveaux et paramètres vers une configuration indépendante.
- Modifier la configuration copiée ne modifie jamais l'année source.

## Transitions autorisées

- `preparation → open`
- `open → closed`
- `closed → archived`

Toute transition sautée ou tout retour vers un état précédent est refusé.

## Périmètre livré

Établissement, années scolaires, cycles, niveaux, matières, périodes, types d'évaluation, formules, frais, personnes, rôles et invitations.
