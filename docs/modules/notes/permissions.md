# Notes — Permissions

Ce document complète `docs/architecture/authorization.md`. Toute lecture ou écriture reste limitée à l’établissement, à l’année scolaire et au périmètre pédagogique autorisés.

## Paramètre d’établissement

L’établissement dispose du paramètre :

```text
Autoriser les enseignants à consulter les autres cours de leurs classes
```

- désactivé par défaut ;
- configurable par un profil autorisé à gérer les paramètres pédagogiques ;
- effet immédiat après activation ou désactivation ;
- n’accorde aucun droit d’écriture supplémentaire.

Une « classe de l’enseignant » est une classe dans laquelle il possède au moins une affectation pédagogique active pour l’année scolaire concernée.

## Permissions de lecture transversale

| Permission | Contenu | Écriture |
|---|---|---|
| `notes.class_overview.read` | Vue consolidée : moyennes par matière, résultats consolidés, absences ou notes manquantes et avancement des saisies | Aucune |
| `notes.class_results.read` | Détail des évaluations et résultats des autres cours de la classe | Aucune |

L’établissement peut autoriser uniquement la vue consolidée ou également le détail. L’accès au détail est plus sensible et doit être affiché explicitement dans la configuration.

## Enseignant

Toujours autorisé dans ses cours affectés :

- voir ses cours ;
- créer des évaluations ;
- saisir et corriger les résultats autorisés ;
- gérer les appréciations de ses matières ;
- consulter ses calculs.

Lorsque le paramètre d’établissement est activé, il peut consulter en lecture seule les autres cours des classes où il possède une affectation active, selon les permissions transversales activées.

Il ne peut jamais, par ce paramètre :

- créer ou modifier une évaluation d’un autre cours ;
- saisir ou corriger les résultats d’un autre cours ;
- modifier l’appréciation d’un autre enseignant ;
- consulter une classe où il n’a aucune affectation active ;
- consulter une autre année ou un autre établissement.

## Enseignant principal

Pour sa classe principale :

- vue consolidée ;
- appréciation générale ;
- lecture des autres matières selon les permissions activées ;
- signalement des éléments manquants.

Le profil Enseignant principal n’étend pas les permissions d’écriture du profil Enseignant aux autres cours.

## Responsable pédagogique

Dans son périmètre de supervision :

- consulter les résultats ;
- suivre la saisie ;
- contrôler les moyennes ;
- gérer les formules autorisées ;
- consulter les rapports de blocage.

## Direction

- vision globale dans l’établissement ;
- contrôle des moyennes ;
- accès aux bulletins selon permissions.

## Administration

- types de note ;
- surcharges ;
- profils et permissions délégables ;
- formules ;
- valeurs par défaut ;
- configuration de la lecture transversale si la permission de paramétrage pédagogique lui est déléguée.

## Tests RLS obligatoires

- option désactivée : un enseignant ne lit que ses cours ;
- option activée : lecture seule des autres cours de ses classes ;
- refus d’écriture sur un autre cours ;
- refus pour une classe sans affectation active ;
- refus pour une affectation expirée ou inactive ;
- refus pour une autre année scolaire ;
- refus interétablissements ;
- retrait immédiat de l’accès après désactivation.
