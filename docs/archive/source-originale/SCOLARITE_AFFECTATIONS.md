# GeeCole — Gestion des affectations pédagogiques

Ce document complète `docs/PRODUCT_DECISIONS.md` et décrit l'organisation fonctionnelle validée des affectations, des cours générés et de leur exposition dans le module Scolarité.

## Décision — Un espace explicite « Affectations »

L'administration doit disposer d'un endroit clairement identifiable pour préparer et gérer les affectations pédagogiques.

L'affectation est la donnée de configuration qui indique :

- qui enseigne ;
- quelle matière ;
- à quelle classe ou à quel niveau utilisé comme classe ;
- pendant quelle période scolaire ;
- pour quelle année scolaire.

Une affectation n'est pas un cours saisi manuellement. Elle constitue la source à partir de laquelle GeeCole génère les éléments pédagogiques nécessaires.

## Positionnement dans le module Scolarité

La navigation cible distingue au minimum :

- **Affectations** : espace administratif de configuration ;
- **Cours** : espace généré et opérationnel ;
- **Évaluations et notes** : travail pédagogique ;
- **Assiduité** : déclaration des absences et retards ;
- **Bulletins** : calcul, contrôle et publication.

L'espace **Affectations** est visible pour les profils autorisés à organiser l'année scolaire. L'enseignant ne modifie pas lui-même ses affectations ordinaires.

## Affectation fondée sur les périodes

L'utilisateur ne saisit pas de dates de début et de fin lorsque l'affectation suit les périodes scolaires configurées dans le cycle.

Exemple :

- classe : 7e A ;
- matière : Mathématiques ;
- enseignant : M. Bah ;
- période : Semestre 1.

Les dates sont déjà connues grâce à la configuration du cycle. GeeCole les résout en interne sans les demander à l'utilisateur.

Les choix disponibles sont :

- toute l'année ;
- une ou plusieurs périodes du cycle.

Une affectation « toute l'année » est équivalente à une affectation couvrant toutes les périodes actives du cycle.

## Grille d'affectation

L'écran principal s'organise par classe.

| Matière | Toute l'année | Période 1 | Période 2 | Période 3 |
| --- | --- | --- | --- | --- |
| Mathématiques | M. Diallo | — | — | — |
| Français | — | Mme Bah | Mme Bah | M. Camara |
| Physique | M. Sylla | — | — | — |

Le mode « toute l'année » évite de répéter le même enseignant sur chaque période. Lorsqu'une matière change d'enseignant, la ligne bascule vers une affectation par période.

## Primaire

Une classe peut recevoir un enseignant principal.

L'action **Appliquer à toutes les matières** génère les affectations de cet enseignant pour toutes les matières héritées du cycle et pour les périodes choisies.

Les matières confiées à un spécialiste deviennent des exceptions, par exemple :

- anglais : M. Bah ;
- informatique : Mme Camara ;
- sport : M. Sylla.

L'affectation spécifique d'une matière est prioritaire sur l'affectation principale de la classe.

## Collège et lycée

L'organisation normale est une affectation par matière et par classe.

L'établissement peut néanmoins utiliser les opérations groupées suivantes :

- sélectionner plusieurs matières et leur affecter le même enseignant ;
- recopier les affectations d'une classe vers une autre ;
- reprendre les affectations de l'année précédente ;
- appliquer un enseignant à toutes les périodes ;
- remplacer un enseignant à partir d'une période donnée.

Toute recopie crée des affectations propres à l'année cible et ne modifie jamais l'historique source.

## Génération des cours

Après validation d'une affectation, GeeCole rend automatiquement disponible le cours correspondant.

Le cours est résolu à partir de :

`année scolaire + classe + matière + période + enseignant affecté`

Le cours apparaît ensuite au bon endroit :

- dans l'espace de travail de l'enseignant ;
- dans la fiche de la classe ;
- dans les listes de création d'évaluation ;
- dans la saisie des notes ;
- dans l'assiduité lorsqu'une absence est rattachée à un cours ;
- dans l'emploi du temps lorsqu'il sera développé.

L'administration ne crée pas une seconde fois le cours après l'affectation.

## Changement d'enseignant

Un changement s'effectue à partir d'une période scolaire.

Exemple :

- Mathématiques, 7e A, Semestre 1 : M. Diallo ;
- Mathématiques, 7e A, Semestre 2 : Mme Camara.

Les évaluations et notes du premier semestre restent rattachées à M. Diallo. Les nouvelles opérations du second semestre utilisent Mme Camara.

L'historique n'est jamais réécrit rétroactivement.

## Moteur de résolution

Pour une classe, une matière et une période données, GeeCole détermine l'enseignant effectif selon cet ordre :

1. affectation spécifique de la matière pour la période ;
2. affectation de la matière pour toute l'année ;
3. affectation principale de la classe pour la période ;
4. affectation principale de la classe pour toute l'année ;
5. aucun enseignant affecté.

Ce même moteur doit être utilisé dans tous les écrans afin d'éviter des résultats contradictoires.

## Contrôles

GeeCole empêche :

- deux enseignants spécifiques pour la même classe, la même matière et la même période ;
- une affectation vers une matière inactive ;
- une affectation vers une classe d'une autre année scolaire ;
- une affectation vers un enseignant inactif ;
- la suppression rétroactive d'une affectation déjà utilisée par une évaluation, une note ou un bulletin publié.

Une affectation manquante reste autorisée pendant la préparation de l'année, mais elle est signalée comme configuration incomplète et bloque seulement les actions qui en dépendent.

## Principe final

Le gestionnaire configure les affectations une seule fois. GeeCole génère ensuite les cours et les affiche automatiquement aux personnes concernées, dans les écrans appropriés.
