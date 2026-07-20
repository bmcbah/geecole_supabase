# RLS et autorisations

## Règles minimales

- Isolation stricte entre établissements.
- Vérification du workspace lorsque plusieurs établissements sont présents.
- Filtrage par année scolaire pour les données annuelles.
- Permissions par module et par action : lire, créer, modifier, publier, annuler, clôturer.
- Un enseignant ne voit que ses cours ou les groupes autorisés.
- Un parent ne voit que les élèves auxquels il est lié.

## Paramétrage intelligent

Les endpoints doivent refuser les opérations d’une fonctionnalité désactivée, même si un client tente un appel direct.
