# Modèle de données conceptuel

## Entités permanentes

Workspace, établissement, personne, élève, parent, membre du personnel, utilisateur.

## Entités annuelles

Année scolaire, cycle activé, niveau activé, classe, période, matière activée, inscription, affectation pédagogique, évaluation, note, absence, bulletin, grille tarifaire, dossier financier, échéance, encaissement.

## Relations importantes

- `parent_student_links` porte les propriétés du lien parent–élève.
- Aucune table Famille n’est requise pour la V1.
- Une affectation peut couvrir plusieurs périodes via une table de liaison.
- Le cours peut être une vue matérialisée ou une projection persistée, mais son identité métier exclut l’enseignant.
- Les surcharges locales référencent toujours l’élément de catalogue d’origine lorsque celui-ci existe.
