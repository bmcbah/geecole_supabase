# Synchronisation des décisions produit validées — juillet 2026

Ce document consigne les décisions fonctionnelles et UX validées lors du cadrage produit de GeeCole et qui n'étaient pas encore formalisées dans `docs/`.

Il complète les documents métiers existants sans les remplacer. En cas de contradiction avec une décision plus précise déjà présente dans un module, la décision modulaire la plus spécifique reste prioritaire et l'écart doit être arbitré avant implémentation.

## Principes transverses

### UX-001 — Convention avant configuration

GeeCole privilégie des parcours prêts à l'emploi, cohérents et adaptés au contexte scolaire guinéen. Le paramétrage existe pour les variantes réelles d'un établissement, mais ne doit pas transformer les écrans courants en formulaires techniques.

### UX-002 — Préservation du layout principal

Le layout principal validé est conservé. Les évolutions futures doivent améliorer la lisibilité, la densité et la hiérarchie visuelle sans remplacer arbitrairement la structure globale.

### UX-003 — Double navigation conservée

La navigation à deux niveaux validée est maintenue. Le premier niveau structure les grands espaces de travail ; le second expose les sous-modules ou vues contextuelles.

### UX-004 — Parcours Liste → Aperçu → Fiche

Pour les entités principales, GeeCole privilégie le parcours suivant :

1. liste de travail ;
2. aperçu rapide dans un drawer lorsqu'il est utile ;
3. fiche complète pour les opérations détaillées.

Le clic simple sélectionne ou ouvre l'aperçu selon le contexte. Les actions explicites restent accessibles par boutons ou menu secondaire.

### UX-005 — Une action principale par écran

Chaque écran doit mettre en avant une seule action principale. Les actions secondaires restent disponibles sans concurrencer visuellement l'action métier prioritaire.

### UX-006 — Standards de listes

Les listes métiers doivent pouvoir supporter selon le besoin :

- recherche et filtres ;
- colonnes configurables ;
- actions de ligne ;
- sélection multiple et actions de masse ;
- vues enregistrées ;
- pagination ou chargement progressif ;
- conservation des préférences utilisateur.

Ces capacités ne doivent être activées que lorsqu'elles apportent une valeur métier réelle.

### UX-007 — Prévention de perte de saisie

Lorsqu'un formulaire modifié est quitté sans enregistrement, GeeCole avertit l'utilisateur avant de perdre les changements.

## Contexte de travail

### CTX-001 — Établissement courant

L'espace de travail possède un établissement courant attaché à la session utilisateur.

Un utilisateur ayant accès à plusieurs établissements peut changer ce contexte depuis le layout principal, sous réserve de ses permissions.

### CTX-002 — Année scolaire courante

L'espace de travail possède une année scolaire courante attachée à la session utilisateur.

Le changement d'année scolaire est accessible depuis le layout principal selon les permissions de l'utilisateur.

### CTX-003 — Pas de sélection répétitive dans les formulaires

Dans l'espace de travail, les formulaires métier ne demandent pas à l'utilisateur de sélectionner l'établissement ni l'année scolaire.

Ils utilisent automatiquement l'établissement courant et l'année scolaire courante. Ces informations peuvent être rappelées visuellement dans l'en-tête du formulaire, mais ne sont pas des champs métier modifiables dans le parcours courant.

### CTX-004 — Rechargement complet lors d'un changement de contexte

Un changement d'établissement ou d'année scolaire invalide et recharge toutes les données dépendantes, notamment :

- élèves et inscriptions ;
- classes, niveaux et cycles ;
- notes et bulletins ;
- frais et paiements ;
- présences ;
- tableaux de bord et statistiques.

Aucune sélection appartenant à l'ancien contexte ne doit rester active silencieusement.

### CTX-005 — Sécurité côté base de données

Le contexte courant améliore l'UX, mais ne remplace jamais les contrôles d'accès. Les requêtes, fonctions et politiques RLS doivent vérifier les établissements et périmètres réellement autorisés pour l'utilisateur.

## Paramétrage scolaire

### SCO-001 — Paramétrage des classes dans Settings

La configuration structurelle des cycles, niveaux et classes est réalisée depuis l'espace de paramétrage de l'établissement.

Les fiches élèves utilisent cette configuration sans la redéfinir.

### SCO-002 — Fusion Niveau / Classe

Un établissement peut activer un mode simplifié lorsque sa réalité métier ne distingue pas réellement le niveau de la classe.

Dans ce mode, la création d'une classe crée ou utilise automatiquement le niveau technique nécessaire au modèle de données. L'utilisateur ne doit pas gérer deux objets redondants dans l'interface.

### SCO-003 — Salle facultative

La salle physique associée à une classe est facultative.

Une classe peut exister et fonctionner sans salle renseignée.

### SCO-004 — Affectation de classe différée

L'inscription d'un élève peut être créée sans affectation immédiate à une classe lorsque l'organisation de l'établissement le nécessite.

L'affectation ou le changement de classe peut ensuite être réalisé depuis la fiche élève ou la liste des élèves.

### SCO-005 — Données administratives de l'établissement

L'établissement peut gérer depuis l'application ses données administratives, ses coordonnées, son logo ou avatar et les informations utilisées dans les documents générés.

## Élèves et inscriptions

### INS-001 — Identité permanente et inscriptions annuelles

La fiche identité de l'élève est permanente.

L'inscription est un rattachement de l'élève à un établissement et à une année scolaire. Une réinscription crée une nouvelle inscription annuelle et ne duplique pas l'identité de l'élève.

### INS-002 — Réinscription individuelle et groupée

La réinscription peut être effectuée individuellement ou en masse.

Les traitements groupés doivent permettre de gérer séparément les exceptions : redoublement, changement d'établissement, abandon, exclusion, réorientation ou autre décision validée.

Cette décision complète la règle NOTE-037 du module Notes et bulletins.

### INS-003 — Parcours d'inscription par étapes

Le parcours d'inscription utilise un stepper progressif :

1. identification ;
2. scolarité ;
3. responsables ;
4. documents administratifs ;
5. paiement des frais d'inscription lorsque cette étape est applicable ;
6. vérification et validation.

L'établissement et l'année scolaire proviennent du contexte de travail.

### INS-004 — Actions de fin de parcours

Le formulaire peut proposer :

- enregistrer ;
- enregistrer et créer un autre élève ;
- enregistrer et ouvrir la fiche.

Une seule action reste visuellement principale.

### INS-005 — Détection des doublons

GeeCole recherche les élèves potentiellement déjà existants pendant la saisie et avant la validation définitive.

La détection ne repose pas uniquement sur le nom. Elle peut combiner :

- matricule ;
- nom et prénom normalisés ;
- date et lieu de naissance ;
- sexe ;
- identité ou téléphone d'un responsable ;
- ancien identifiant administratif disponible.

### INS-006 — Traitement des doublons

Un matricule identique dans le périmètre où son unicité est garantie bloque la création.

Les correspondances probables déclenchent un avertissement permettant :

- d'ouvrir la fiche existante ;
- de réinscrire l'élève existant ;
- de créer malgré tout avec une justification lorsque l'utilisateur est autorisé.

La similarité ne doit pas fusionner automatiquement deux identités.

### INS-007 — Fiche élève

La fiche élève conserve le layout validé et présente au minimum :

- identité et statut ;
- scolarité courante ;
- responsables ;
- état du dossier ;
- historique scolaire ;
- notes ;
- bulletins et documents pédagogiques ;
- présences ;
- finance ;
- documents administratifs ;
- historique des opérations.

### INS-008 — Historique scolaire permanent

L'historique scolaire est affiché par année et conserve au minimum l'établissement, le cycle, le niveau, la classe, la décision de fin d'année et les bulletins associés.

Cette décision complète la règle NOTE-038 du module Notes et bulletins.

## Responsables, parents et tuteurs

### RESP-001 — Plusieurs responsables par élève

Un élève peut être rattaché à plusieurs responsables : père, mère, tuteur, responsable financier ou autre rôle configuré.

Un même responsable peut être rattaché à plusieurs élèves.

### RESP-002 — Relation porteuse de rôle

Le rôle, le caractère principal, les autorisations de récupération, l'accès au portail et les responsabilités financières appartiennent à la relation entre l'élève et le responsable, et non uniquement à la fiche du responsable.

### RESP-003 — Recherche avant création

Lors de l'ajout d'un responsable, GeeCole propose d'abord de rechercher une personne existante avant d'en créer une nouvelle afin de limiter les doublons familiaux.

### RESP-004 — Modification, détachement et suppression

Un responsable peut être modifié.

Il peut être détaché d'un élève sans supprimer sa fiche.

Sa suppression définitive n'est autorisée que lorsqu'il n'est plus rattaché à aucun élève et qu'aucune autre dépendance métier ou légale n'impose sa conservation.

## Documents de l'élève

### DOC-001 — Navigation documentaire séparée

La fiche élève distingue au minimum :

- documents administratifs déposés ;
- bulletins ;
- certificats, attestations et relevés générés.

Les documents pédagogiques déjà définis dans NOTE-031 restent gérés par le module Notes et bulletins.

### DOC-002 — Documents administratifs

Les documents administratifs peuvent inclure acte de naissance, photo, certificat médical, pièce d'identité ou documents personnalisés configurés par l'établissement.

Le système peut indiquer les documents reçus, manquants, expirés ou non applicables.

### DOC-003 — Gestion des fichiers

Un document peut être consulté, remplacé ou détaché selon les permissions.

La suppression physique n'est autorisée que lorsqu'aucune inscription, procédure, génération documentaire ou obligation de conservation ne dépend du fichier. Sinon, le système procède à un archivage ou à un détachement logique.

## Notes dans la fiche élève

### NOTE-UI-001 — Organisation par période

La vue Notes de la fiche élève est organisée par période scolaire : trimestre, semestre ou autre période configurée pour le cycle.

### NOTE-UI-002 — Grille par matière et type de note

Dans chaque période, la vue principale utilise une grille :

- une ligne par matière ;
- une colonne par type de note actif ;
- les notes correspondantes dans les cellules ;
- une colonne de moyenne de matière lorsque le calcul est disponible.

La terminologie « type de note » respecte NOTE-008.

### NOTE-UI-003 — Détail d'une matière

L'ouverture d'une matière affiche le détail de ses notes, évaluations, appréciations, statuts de publication et informations d'audit sans dupliquer les règles métier du module Notes et bulletins.

### NOTE-UI-004 — Résumé de période

La vue peut afficher de manière compacte la moyenne générale, le rang, la décision disponible et l'état de publication du bulletin.

Les calculs et règles de publication restent ceux du module Notes et bulletins.

## Paiement lors de l'inscription

### FIN-INS-001 — Étape conditionnelle

L'étape Paiement apparaît dans le stepper uniquement lorsqu'un frais configuré est exigible ou payable au moment de l'inscription.

### FIN-INS-002 — Modes de règlement acceptés

Selon le paramétrage et les permissions, l'inscription peut accepter :

- paiement intégral ;
- paiement partiel ;
- paiement différé avec dette initiale ;
- exonération ou remise autorisée.

### FIN-INS-003 — Politique de validation configurable

L'établissement configure la politique applicable :

- paiement obligatoire avant validation ;
- acompte minimal obligatoire ;
- inscription autorisée avec solde restant dû.

GeeCole ne bloque pas systématiquement toute inscription non soldée, afin de respecter les pratiques réelles des établissements guinéens.

### FIN-INS-004 — Traçabilité du paiement initial

Le paiement initial conserve au minimum le montant attendu, le montant réglé, le moyen de paiement, la référence, la date, l'auteur de la saisie, la remise ou exonération éventuelle et le reste à payer.

Le reçu est généré ou rendu disponible selon le paramétrage financier.

## Conséquences d'implémentation

Ces décisions impliquent notamment :

- un contexte de travail explicite côté application, sans l'utiliser comme unique mécanisme de sécurité ;
- une séparation stricte entre identité élève et inscription annuelle ;
- une relation plusieurs-à-plusieurs entre élèves et responsables ;
- une stratégie de détection de doublons explicable et non destructive ;
- des documents classés par nature et protégés par des règles de conservation ;
- un parcours d'inscription capable de créer une dette ou un paiement initial ;
- la réutilisation du moteur de notes existant dans la fiche élève.

## Impact documentaire futur

Ce document est une synchronisation transversale. Lors du prochain cadrage détaillé de chaque module, les décisions devront être réparties dans les fichiers métiers spécialisés correspondants sans perdre leurs identifiants ni leur intention.

Aucun fichier existant n'a été réécrit dans cette synchronisation.
