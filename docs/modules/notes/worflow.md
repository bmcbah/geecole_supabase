# Modèle standard de workflow métier --- GeeCole

Ce document définit le format de référence utilisé pour documenter tous
les workflows métier de GeeCole.

------------------------------------------------------------------------

# Structure standard

## 1. Objectif

Décrire le but du workflow et la valeur métier apportée.

------------------------------------------------------------------------

## 2. Acteurs

Lister les profils impliqués :

-   Acteur principal
-   Acteurs secondaires

------------------------------------------------------------------------

## 3. Préconditions

Définir les conditions obligatoires avant le démarrage du workflow.

Exemples :

-   année scolaire active ;
-   période créée ;
-   permissions disponibles ;
-   données de référence configurées.

------------------------------------------------------------------------

## 4. Déclencheur

Décrire l'événement ou l'action qui lance le workflow.

Exemple :

``` text
Notes & Bulletins
→ Configuration
→ Périodes
→ Ouvrir la période
```

------------------------------------------------------------------------

## 5. Déroulement normal

Décrire le scénario nominal étape par étape.

Exemple :

``` text
Étape 1
↓
Étape 2
↓
Étape 3
↓
Résultat
```

------------------------------------------------------------------------

## 6. Cas alternatifs

Décrire les variantes du scénario principal.

Exemples :

-   traitement partiel ;
-   confirmation utilisateur ;
-   exceptions autorisées.

------------------------------------------------------------------------

## 7. Cas d'erreur

Décrire :

-   erreurs bloquantes ;
-   erreurs fonctionnelles ;
-   messages attendus ;
-   comportement de l'application.

------------------------------------------------------------------------

## 8. Règles métier

Lister toutes les règles fonctionnelles appliquées pendant le workflow.

Chaque règle doit être indépendante et facilement réutilisable.

------------------------------------------------------------------------

## 9. États des objets

Décrire les changements d'état des entités métier.

Exemple :

``` text
Créé
↓
En cours
↓
Validé
↓
Publié
↓
Archivé
```

------------------------------------------------------------------------

## 10. Résultat

Décrire l'état final obtenu lorsque le workflow se termine correctement.

------------------------------------------------------------------------

## 11. Traçabilité (Audit)

Préciser les informations historisées.

Exemple :

-   utilisateur ;
-   date ;
-   heure ;
-   ancienne valeur ;
-   nouvelle valeur ;
-   motif ;
-   commentaire.

------------------------------------------------------------------------

## 12. Notifications

Décrire :

-   destinataires ;
-   canal ;
-   déclencheur ;
-   contenu attendu.

------------------------------------------------------------------------

# Exemple --- Workflow 01 : Ouverture d'une période

## Objectif

Rendre une période disponible pour la saisie des notes après validation
des prérequis pédagogiques.

## Acteurs

-   Administration
-   Responsable pédagogique
-   Direction

## Préconditions

-   année scolaire active ;
-   période créée ;
-   affectations validées ;
-   formules de calcul disponibles ;
-   types de note actifs.

## Déclencheur

``` text
Notes & Bulletins
→ Configuration
→ Périodes
→ Ouvrir la période
```

## Déroulement normal

``` text
Vérification automatique
↓
Contrôles
↓
Confirmation
↓
Ouverture
↓
Création des contextes de cours
↓
Début de la saisie
```

## Cas alternatifs

-   ouverture avec avertissements non bloquants si autorisée.

## Cas d'erreur

-   affectation manquante ;
-   formule absente ;
-   période déjà ouverte ;
-   année scolaire fermée.

## Règles métier

-   une erreur bloquante empêche l'ouverture ;
-   toute réouverture est auditée.

## États

``` text
Brouillon
↓
À préparer
↓
Prête
↓
Ouverte
↓
En contrôle
↓
Clôturée
↓
Archivée
```

## Résultat

La période est ouverte et les enseignants peuvent accéder à leurs
cahiers de notes.

## Traçabilité

-   utilisateur ;
-   date ;
-   heure ;
-   résultat des contrôles ;
-   décision ;
-   motif.

## Notifications

Selon la configuration :

-   notification aux enseignants ;
-   notification aux responsables en cas d'anomalie.

------------------------------------------------------------------------

# Convention GeeCole

Tous les workflows des modules (Notes, Frais, Inscriptions, Présences,
Emploi du temps, Bulletins, etc.) doivent respecter cette structure afin
d'assurer une documentation homogène, maintenable et exploitable par les
équipes métier, UX et développement.