# Paramétrage — Spécifications métier

## Mission

Adapter GeeCole à chaque établissement sans valeur pédagogique codée dans le frontend.

## Règles structurantes

- Un établissement possède une seule année scolaire ouverte.
- Plusieurs années peuvent être en préparation.
- Une année clôturée ou archivée est en lecture seule.
- Les configurations sont rattachées à l'année sélectionnée.
- Le catalogue des cycles est piloté par la base.
- L'établissement active les cycles qu'il propose.
- Les niveaux appartiennent à un cycle actif.
- Les noms peuvent se répéter ; les codes sont uniques dans leur portée annuelle.
- La suppression logique conserve toujours l'historique.
- Le clonage produit une copie indépendante.

## Périmètre livré

Établissement, années scolaires, cycles, niveaux, matières, périodes, types d'évaluation, formules, frais, personnes, rôles et invitations.
