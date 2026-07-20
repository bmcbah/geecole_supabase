# GeeCole - Compléments à intégrer à la Product Bible

> Ce document regroupe les décisions et principes qui manquent ou
> méritent d'être explicités.

# 1. Catalogue métier préconfiguré

## Philosophie

GeeCole applique le principe **Convention \> Configuration**.

Un établissement ne construit jamais son référentiel depuis zéro.

À la création d'un établissement, GeeCole fournit un catalogue activable
comprenant :

-   Cycles scolaires guinéens
-   Niveaux
-   Matières
-   Périodes (trimestres, semestres...)
-   Types de frais
-   Modèles de documents
-   Modèles d'appréciations
-   Profils utilisateurs
-   Paramètres par défaut

L'établissement peut :

-   activer
-   désactiver
-   renommer
-   compléter

mais jamais repartir d'une base vide.

------------------------------------------------------------------------

# 2. Assistant de première mise en service

Parcours recommandé :

1.  Création de l'établissement
2.  Email d'activation
3.  Définition du mot de passe
4.  Première connexion
5.  Assistant de bienvenue
6.  Choix :
    -   Utiliser le catalogue GeeCole
    -   Importer des données existantes
7.  Vérification des paramètres
8.  Accès au Dashboard

Objectif : moins de 10 minutes entre la création du compte et les
premières inscriptions.

------------------------------------------------------------------------

# 3. Contexte global

Le contexte de l'application est toujours :

Workspace → Établissement → Année scolaire

Ce contexte est sélectionnable depuis le header (style Supabase).

Tous les formulaires utilisent automatiquement ce contexte.

Aucun formulaire métier ne demande de choisir à nouveau l'établissement
ou l'année.

------------------------------------------------------------------------

# 4. Paramétrage intelligent

Les options activées dans Settings modifient l'ensemble de
l'application.

Exemples :

-   Utiliser les niveaux
-   Utiliser les salles
-   Utiliser les options
-   Utiliser le transport
-   Utiliser l'internat

Lorsque la fonctionnalité est désactivée :

-   les menus disparaissent
-   les colonnes disparaissent
-   les champs disparaissent
-   les validations s'adaptent

L'utilisateur ne voit jamais des éléments inutiles.

------------------------------------------------------------------------

# 5. Architecture UX standard

Toutes les pages suivent la même structure :

Sidebar ↓ Header ↓ Toolbar ↓ Filtres ↓ Liste / Tableau ↓ Drawer ↓ Page
complète

Le Drawer sert à consulter rapidement.

La page complète est réservée aux modifications importantes.

------------------------------------------------------------------------

# 6. Standards des listes

Toutes les listes respectent les mêmes règles.

-   clic : aperçu (Drawer)
-   double clic : page complète
-   bouton édition
-   menu contextuel
-   actions groupées
-   pagination
-   recherche
-   filtres persistants

Navigation clavier prévue :

-   Entrée
-   Échap
-   Ctrl/Cmd + K
-   Flèches

------------------------------------------------------------------------

# 7. Recherche globale

Commande :

Ctrl + K

Recherche dans :

-   élèves
-   responsables
-   enseignants
-   classes
-   cycles
-   documents
-   paiements
-   factures
-   paramètres

La recherche doit être accessible partout.

------------------------------------------------------------------------

# 8. États vides (Empty States)

Une page vide n'affiche jamais uniquement un tableau vide.

Elle explique :

-   pourquoi la liste est vide
-   quoi faire
-   propose une action principale

Exemple :

"Aucun élève enregistré."

→ Bouton : Inscrire un élève.

------------------------------------------------------------------------

# 9. Standards des formulaires

Tous les formulaires utilisent les mêmes principes :

-   sections cohérentes
-   validation immédiate
-   messages d'erreur homogènes
-   autosave lorsque pertinent
-   confirmation uniquement pour les actions destructrices

Les steppers sont utilisés lorsque plusieurs informations doivent être
saisies.

------------------------------------------------------------------------

# 10. Dashboard orienté action

Le Dashboard répond toujours à la question :

"Que dois-je faire maintenant ?"

Ordre recommandé :

1.  Aujourd'hui
2.  Actions prioritaires
3.  Mes raccourcis
4.  Activité récente
5.  Statistiques

Les statistiques restent toujours en fin de page.

------------------------------------------------------------------------

# 11. Campagnes

Le concept de campagne doit pouvoir être réutilisé.

Exemples :

-   Campagne d'inscription
-   Campagne de réinscription
-   Campagne d'examen
-   Campagne de bulletins
-   Campagne financière

Une campagne représente une opération métier planifiée.

------------------------------------------------------------------------

# 12. Guide de cohérence UX

Règles globales :

-   Une liste ouvre toujours un Drawer.
-   Un Drawer ouvre éventuellement une page.
-   Les actions principales sont en haut à droite.
-   Les filtres sont toujours au-dessus des listes.
-   Les couleurs de statuts sont identiques partout.
-   Les icônes sont homogènes.
-   Les composants sont réutilisés entre tous les modules.
-   Les écrans doivent privilégier la densité plutôt que les grandes
    cartes.

Objectif :

Créer une identité visuelle immédiatement reconnaissable pour GeeCole.
