# Scolarité — Spécifications métier

## Mission

Gérer le parcours administratif d'un élève, de sa préinscription à sa sortie, sans perdre l'historique annuel.

## Fonctionnalités MVP

1. Vue d’ensemble du module
2. Dossier élève
3. Inscriptions
4. Classes et affectations
5. Liste et recherche des élèves
6. Responsables légaux et contacts
7. Documents administratifs via le système documentaire transverse
8. Frais générés par l'inscription
9. Assiduité
10. Évaluations, notes et bulletins exposés depuis leurs modules propriétaires

La fonctionnalité **Inscriptions** regroupe la nouvelle inscription, la préinscription et la réinscription. Ces opérations partagent le même objet annuel, le même moteur de contrôles et le même workflow de décision, tout en conservant leur origine métier.

## Règles communes

- Un élève est une personne durable et peut posséder un compte utilisateur.
- Le matricule est unique dans l'établissement et ne change pas entre les années.
- Une inscription appartient à une seule année scolaire et un seul niveau.
- Un élève ne possède qu'une inscription active par année.
- Une inscription conserve les instantanés du niveau, du cycle et des frais appliqués.
- Changer une règle future ne modifie pas une dette ou un document déjà généré.
- Une réinscription crée une nouvelle inscription annuelle ; elle ne modifie pas l'ancienne.
- Les doublons probables sont signalés avant création.
- Une suppression administrative devient une annulation historisée.
- Toute modification sensible conserve auteur, date et motif.
- Seules les inscriptions `confirmed` alimentent la liste officielle des élèves inscrits de l’année.

## Définitions

- La **préinscription** enregistre un candidat sans en faire automatiquement un élève comptabilisé.
- La **nouvelle inscription** crée le parcours annuel d’une personne qui n’est pas encore inscrite dans l’année cible.
- La **réinscription** crée l'inscription d'une nouvelle année pour un élève déjà connu.
- La préinscription reste facultative : selon sa politique, l'établissement peut autoriser l'inscription directe.

## États détaillés d’une inscription

- `draft` : brouillon incomplet, sans effet financier ;
- `pre_registered` : candidat enregistré, hors effectif confirmé ;
- `pending` : dossier soumis et en cours de contrôle ;
- `confirmed` : inscription officielle ;
- `rejected` : dossier refusé avec motif ;
- `withdrawn` : démarche abandonnée par la famille ;
- `cancelled` : inscription annulée et conservée dans l'historique ;
- `transferred` : départ vers un autre établissement.

Une inscription confirmée n'est jamais supprimée physiquement.

Les transitions sont des actions métier explicites. Elles ne sont jamais réalisées par une modification libre de statut.

## Workspace Inscriptions

Le workspace Inscriptions constitue la file de travail unique pour :

- créer une nouvelle inscription ;
- créer une préinscription lorsque la politique l’autorise ;
- réinscrire un élève existant ;
- reprendre un brouillon ;
- contrôler les dossiers ;
- confirmer une inscription ;
- demander un complément ;
- rejeter, retirer, annuler ou transférer avec motif ;
- traiter les opérations individuelles et groupées autorisées.

Chaque dossier conserve son origine : `new_enrollment`, `pre_enrollment` ou `reenrollment`.

## Parcours commun

1. Rechercher un élève existant et afficher les doublons probables.
2. Saisir ou reprendre l'identité.
3. Rechercher ou créer les responsables et désigner le contact principal, le responsable financier et les personnes autorisées.
4. Choisir l'année, le cycle, le niveau et éventuellement la classe.
5. Récupérer ou saisir la décision pédagogique lorsqu’elle est nécessaire.
6. Contrôler les documents configurés par l'établissement.
7. Calculer et présenter les frais applicables.
8. Afficher un récapitulatif avant enregistrement ou confirmation.

Le parcours de réinscription précharge les données durables et affiche les dettes antérieures sans les mélanger aux frais de la nouvelle année.

## Décision pédagogique

La décision pédagogique répond à la question : dans quel niveau ou parcours l’élève doit-il poursuivre sa scolarité ?

Elle est distincte de la confirmation administrative.

Elle peut représenter :

- passage au niveau suivant ;
- redoublement ;
- orientation vers un autre cycle, niveau ou parcours ;
- admission sous dérogation ;
- décision non renseignée ;
- décision à confirmer.

Elle peut provenir :

- du dernier bulletin publié ;
- d’un examen ou d’un conseil ;
- d’une décision manuelle autorisée ;
- d’un import provenant d’un autre établissement.

Pour un nouvel élève, GeeCole distingue le niveau demandé du niveau retenu.

Toute correction d’une décision pédagogique historisée exige le droit adapté et un motif.

## Confirmation administrative

La confirmation administrative répond à la question : le dossier remplit-il les conditions pour devenir une inscription officielle ?

Elle peut contrôler notamment :

- l’identité de l’élève ;
- la présence d’un responsable principal ou d’une dérogation ;
- l’année, le cycle et le niveau ;
- la décision pédagogique lorsqu’elle est obligatoire ;
- les doublons non résolus ;
- les documents obligatoires ;
- la capacité du niveau ou de la classe ;
- l’affectation à une classe lorsqu’elle est obligatoire ;
- les règles financières et le paiement lorsqu’il est bloquant ;
- les permissions et dérogations.

La confirmation :

- attribue ou conserve le matricule ;
- crée ou confirme l'inscription annuelle ;
- génère les frais applicables avec leur montant instantané ;
- affecte l'élève à une classe si elle est choisie ;
- rend l’élève visible dans la liste officielle des élèves inscrits ;
- produit les documents administratifs configurés, par exemple une fiche ou un certificat d'inscription.

La confirmation génère la dette indépendamment de son paiement, sauf si la politique impose un paiement bloquant avant confirmation.

## Moteur backend de contrôles d’inscription

Le backend calcule une synthèse de contrôles pour chaque dossier.

Chaque contrôle possède :

- un code métier stable ;
- une gravité : `blocking`, `warning`, `information` ou `success` ;
- un domaine : identité, responsables, documents, finances, capacité, pédagogie, doublons ou autre domaine explicite ;
- une clé de message traduisible ;
- une action de résolution éventuelle.

La synthèse expose au minimum :

- le nombre de blocages ;
- le nombre d’avertissements ;
- le nombre d’informations ;
- l’état global `blocked`, `warning` ou `ready` ;
- le détail des contrôles.

Le même moteur est utilisé pour :

- la colonne **Contrôles** du workspace Inscriptions ;
- l’autorisation de confirmer ;
- les imports ;
- les opérations groupées ;
- les RPC et services backend ;
- les alertes du dashboard.

Le frontend ne recalcule jamais si une règle est bloquante.

## Politiques configurables par établissement

Les décisions suivantes ne sont pas codées en dur :

- autoriser ou non la préinscription ;
- autoriser ou non l'inscription directe ;
- autoriser la préparation des réinscriptions avant la clôture de l'année courante ;
- autoriser une confirmation directe ou imposer un brouillon ;
- anciennes dettes : information, avertissement ou blocage ;
- exiger ou non une décision pédagogique ;
- reprendre la décision du bulletin final lorsqu'elle existe ;
- redoublement : autorisé, soumis à dérogation ou interdit ;
- exiger ou non un paiement avant confirmation ;
- exiger ou non une classe précise à la confirmation ;
- faire compter ou non une préinscription dans les capacités ;
- mode de capacité : information, avertissement ou blocage ;
- documents obligatoires pour préinscrire et pour confirmer ;
- autoriser une confirmation avec pièces manquantes ;
- générer automatiquement ou manuellement les frais de réinscription ;
- autoriser ou non la préparation groupée ;
- résultat d'une préparation groupée : brouillon, préinscription ou inscription confirmée ;
- proposer le cycle suivant uniquement s'il est actif dans l'établissement pour l'année cible ;
- format de génération du matricule.

Valeurs par défaut recommandées pour un nouvel établissement :

- préinscription autorisée ;
- inscription directe autorisée ;
- préparation anticipée des réinscriptions autorisée ;
- paiement non bloquant ;
- niveau obligatoire et classe facultative ;
- préinscription hors effectif confirmé, mais capacité prévisionnelle affichée ;
- dépassement de capacité avec avertissement ;
- confirmation possible avec pièces manquantes et suivi visible ;
- anciennes dettes avec avertissement ;
- décision pédagogique proposée depuis le bulletin lorsqu’elle existe et corrigeable avec motif ;
- préparation groupée en brouillon.

Ces politiques sont définies au niveau de l'établissement. Une surcharge annuelle peut être préparée pour une année ouverte. Après clôture, la valeur appliquée reste historisée et ne change pas rétroactivement les inscriptions.

## Règles complémentaires validées

- Au moins un contact principal est normalement requis ; une dérogation motivée nécessite un droit adapté.
- Un responsable peut être lié à plusieurs élèves et doit être recherché avant création.
- La classe est distincte du niveau et peut être affectée ultérieurement si la politique l'autorise.
- Une remise exige un motif et une autorisation.
- L'annulation n'efface ni dette ni paiement ; avoirs et remboursements sont des opérations séparées.
- Un compte utilisateur n'est pas nécessaire pour créer le dossier élève.

## Vue d’ensemble du module

La Vue d’ensemble agrège les informations opérationnelles du parcours élève.

Elle expose notamment :

- les élèves inscrits ;
- les dossiers d’inscription en cours ;
- les préinscriptions ;
- les élèves sans classe ;
- l’assiduité à traiter ;
- les documents à contrôler ;
- les actions récentes ;
- les alertes administratives, pédagogiques et documentaires affectant directement le parcours d’un élève.

Les alertes peuvent provenir de Scolarité, Notes ou Bulletins, mais conservent leur module propriétaire et leur destination.

Le bloc `Travail à traiter` n’est pas un concept métier séparé : il est absorbé dans la liste d’alertes.

## Liste des élèves

La liste Élèves contient uniquement les inscriptions `confirmed` de l’année scolaire sélectionnée.

Le mode regroupé utilise le responsable principal comme clé fonctionnelle et permet de plier ou déplier les groupes pour afficher les élèves liés.

## Classes

Une classe est une division annuelle d'un niveau : par exemple 7e A. Sa capacité peut bloquer ou avertir selon le paramétrage. Un transfert entre classes est historisé.

## Assiduité

Absence ou retard par date, créneau et motif. États : non justifié, justifié, en attente. Les justificatifs et notifications sont historisés.

## Évaluations, notes et bulletins

Les notes utilisent les types, périodes, barèmes et formules du Paramétrage. Une période verrouillée empêche la modification sans réouverture autorisée. Le bulletin publié devient une version immuable.

La fiche Élève consomme les résultats officiels du module Notes. Elle ne recalcule pas une moyenne simplifiée.

Le bulletin affiché dans la fiche Élève est le document généré, validé et publié par le module Notes.

## Système documentaire transverse

GeeCole ne duplique pas une gestion documentaire dans chaque module.

Un document est organisé selon quatre niveaux :

1. attachement métier : module, type d’entité et identifiant ;
2. catégorie ;
3. document logique ;
4. versions physiques dans Supabase Storage.

Exemples :

- Scolarité → élève → document administratif ;
- Notes → élève et période → bulletin ;
- Personnel → employé → contrat ;
- Finances → paiement → reçu.

Un bulletin publié reste la propriété métier du module Notes et est rendu visible dans la fiche Élève par le `DocumentExplorer` partagé.

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
