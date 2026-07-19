# Module Notes et bulletins — Décisions métier validées

Ce document consigne uniquement les décisions fonctionnelles validées pour le module Notes et bulletins.

## NOTE-001 — Dépendance au personnel enseignant

Le module Notes ne gère pas les enseignants comme des fiches propres.

Il utilise la liste des membres du personnel disposant d'une fonction active de type Enseignant.

Un enseignant peut recevoir une affectation pédagogique sans disposer d'un compte utilisateur GeeCole.

## NOTE-002 — Création des affectations pédagogiques

Le système doit proposer deux modes de gestion :

- une affectation individuelle ;
- une gestion en tableau permettant de créer et de modifier plusieurs affectations.

Le mode tableau est une facilité d'administration et ne supprime pas la nécessité d'identifier clairement chaque affectation métier.

## NOTE-003 — Affectations multiples paramétrables

L'établissement choisit s'il autorise ou non plusieurs enseignants sur une même combinaison pédagogique.

Lorsque le paramètre est désactivé, une seule affectation active est autorisée pour le périmètre concerné.

Lorsque le paramètre est activé, plusieurs enseignants peuvent être affectés simultanément et des rôles différenciés peuvent être utilisés, par exemple responsable principal, coenseignant, remplaçant ou intervenant.

## NOTE-004 — Rôles des affectations partagées

Les rôles différenciés n'existent que lorsque l'établissement autorise les affectations multiples.

Lorsque les affectations multiples sont interdites, aucun mécanisme de rôle partagé n'est nécessaire.

Les droits exacts associés à chaque rôle seront définis pendant le cadrage détaillé du module Notes.

## NOTE-005 — Période de l'affectation

Une affectation pédagogique dépend de la période définie pour le cycle concerné.

Une même affectation peut couvrir une ou plusieurs périodes du cycle selon le besoin de l'établissement.

Ce rattachement permet d'historiser les changements d'enseignant ou d'organisation au cours d'une même année scolaire.

## NOTE-006 — Remplacements paramétrables

Les règles de remplacement sont paramétrables par établissement.

Le cadrage détaillé devra préciser notamment l'accès aux évaluations antérieures, la modification des notes existantes, la création de nouvelles évaluations, le maintien éventuel de l'accès de l'enseignant remplacé et le transfert de responsabilité du cahier.

## NOTE-007 — Matières disponibles dans une classe

Le module Notes utilise les matières affectées au niveau de la classe.

La classe hérite des matières configurées sur son niveau ; le module Notes ne crée pas une affectation de matière propre à chaque classe dans le fonctionnement standard.
