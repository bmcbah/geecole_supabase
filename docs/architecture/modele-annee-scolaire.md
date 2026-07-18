# Modèle établissement et année scolaire

## Décision structurante

Toute donnée GeeCole est classée comme permanente, structurelle annuelle ou opérationnelle annuelle.

Le contexte de travail est déterminé par :

1. l'établissement actif ;
2. l'année scolaire sélectionnée.

## États d'une année scolaire

- `draft` : année en préparation ;
- `active` : année courante de travail ;
- `closed` : année clôturée, principalement consultable ;
- `archived` : année historique archivée.

Un établissement possède au maximum une année active, mais peut préparer la suivante pendant que l'année courante est ouverte.

## Données permanentes

Ces données ne sont pas recréées chaque année :

- établissements ;
- élèves ;
- familles ;
- responsables ;
- utilisateurs ;
- catalogues réutilisables lorsque leur identité doit rester stable.

## Données structurelles annuelles

Elles décrivent l'organisation d'une année et peuvent être dupliquées vers la suivante :

- cycles ouverts ;
- niveaux ouverts ;
- classes ;
- périodes ;
- matières et coefficients ;
- paramètres pédagogiques ;
- grilles tarifaires ;
- plans de paiement ;
- avantages tarifaires.

La duplication doit conserver une origine (`copied_from_id` ou mécanisme équivalent) sans créer de dépendance fonctionnelle avec l'année précédente.

## Données opérationnelles annuelles

Elles ne sont jamais dupliquées automatiquement :

- inscriptions ;
- affectations ;
- notes ;
- absences ;
- dossiers de frais ;
- échéances ;
- paiements ;
- reçus ;
- bulletins et décisions.

## Navigation

Le sélecteur d'établissement et d'année scolaire doit rester visible. Changer d'année change les tableaux de bord, listes, classes, inscriptions, tarifs, évaluations et opérations financières.

Un filtre d'année implicite ou caché ne doit jamais mélanger deux exercices scolaires.

## Historique financier

Le dossier de frais appartient à l'inscription annuelle, pas directement à l'élève.

La fiche élève peut afficher une synthèse séparée :

- solde de l'année sélectionnée ;
- dettes des années précédentes ;
- accès au détail par année.

Les soldes ne sont jamais fusionnés silencieusement. Un paiement couvrant plusieurs années doit comporter une affectation explicite.

## Clôture

Une année clôturée interdit les opérations ordinaires de structure et d'inscription. La consultation, l'impression et l'encaissement exceptionnel d'une dette antérieure peuvent rester autorisés selon les permissions, avec audit obligatoire.

## Sécurité

Le cloisonnement n'est pas uniquement visuel. Les politiques RLS doivent vérifier l'établissement, l'autorisation d'accès à l'année et les restrictions liées à son état.
