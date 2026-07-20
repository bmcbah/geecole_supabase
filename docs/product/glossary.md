# Glossaire

> **Statut : décision consolidée**  
> Cette documentation intègre les arbitrages validés le 20 juillet 2026.


## Workspace
Conteneur supérieur pouvant regrouper un ou plusieurs établissements. Le comportement multi-workspace sera détaillé dans une spécification dédiée.

## Établissement
École ou structure scolaire administrée dans GeeCole.

## Année scolaire
Contexte annuel de travail. États : `draft`, `active`, `closed`, `archived`.

## Cycle
Regroupement pédagogique, par exemple primaire, collège ou lycée.

## Niveau
Étape pédagogique d’un cycle. Un niveau peut être utilisé directement comme classe lorsque l’option de fusion est activée.

## Classe
Groupe opérationnel d’élèves. En mode « niveau utilisé comme classe », GeeCole crée ou résout automatiquement le groupe correspondant sans demander une création manuelle.

## Parent
Personne liée à un ou plusieurs élèves. Le terme « Responsable » n’est pas utilisé dans l’interface métier.

## Famille
Vue métier implicite. Deux élèves appartiennent à la même famille/fratrie lorsqu’ils partagent au moins un parent. Il n’existe pas de table `families` obligatoire ni de CRUD Famille.

## Affectation pédagogique
Lien entre une année, une classe ou un niveau utilisé comme classe, une matière, un enseignant et une ou plusieurs périodes.

## Cours
Contexte pédagogique résolu par `année + classe/niveau + matière + période`. L’enseignant effectif est obtenu par le moteur d’affectation.

## Catalogue GeeCole
Référentiel fourni par la plateforme. Il n’est pas modifié par l’établissement.

## Surcharge locale
Configuration locale qui renomme, complète, active, désactive ou paramètre un élément du catalogue sans altérer sa définition d’origine.

## Document administratif
Pièce demandée ou conservée pour le dossier administratif d’un élève ou d’un membre du personnel.
