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

## NOTE-008 — Terminologie et catalogue des types de notes

Le terme métier officiel est « type de note ».

Une évaluation est un type de note parmi d'autres. GeeCole fournit un catalogue de types de notes activables et extensibles par l'établissement, par exemple évaluation, devoir, interrogation, composition, examen, travaux pratiques, oral ou projet.

## NOTE-009 — Barème des notes

Le barème dépend du paramétrage de l'établissement.

Le système ne doit pas imposer que toutes les notes soient saisies sur 20.

## NOTE-010 — Poids déterminé par la formule

Un type de note ne porte aucun coefficient propre.

Le poids appliqué aux notes est déterminé exclusivement par la formule de calcul configurée.

## NOTE-011 — Traitement des absences

Une absence non justifiée entraîne une note égale à zéro.

Une absence justifiée entraîne soit une dispense, soit un report de la note selon la situation retenue.

## NOTE-012 — Dispense

Une note marquée comme dispensée est conservée, mais elle n'entre pas dans le calcul des moyennes.

## NOTE-013 — Précision des moyennes

Les moyennes sont arrondies à deux décimales.

## NOTE-014 — Moteur de formules

GeeCole dispose d'un moteur de formules arithmétiques permettant notamment l'utilisation d'agrégats tels que la moyenne, la somme, le minimum, le maximum et le nombre de notes.

Les conditions de type « si/alors » ne font pas partie du périmètre V1.

## NOTE-015 — Portée des formules

Une formule est définie au niveau du cycle et s'applique à toutes les matières de ce cycle.

La même formule est utilisée pour toutes les périodes du cycle dans la V1.

Une évolution ultérieure pourra introduire des surcharges par niveau ou par matière sans modifier la règle V1.

## NOTE-016 — Références utilisables dans une formule

Une formule peut référencer :

- un type de note, auquel cas l'agrégat s'applique aux notes de ce type ;
- une note précise identifiée par un code unique.

## NOTE-017 — Notes manquantes

Le comportement d'une formule lorsqu'une note attendue est absente est paramétrable.

Le paramétrage peut notamment prévoir l'ignorance de la note, l'utilisation de zéro ou le blocage du calcul.

## NOTE-018 — Nombre minimal de notes

L'établissement peut définir un nombre minimal de notes requis, notamment par type de note, avant le calcul ou la publication d'une moyenne.

## NOTE-019 — Verrouillage et modification des notes

Un enseignant peut modifier une note tant qu'elle n'est pas verrouillée.

Après verrouillage, seul un utilisateur administratif autorisé peut la modifier.

Toute modification d'une note déjà utilisée dans un bulletin déclenche le recalcul automatique du bulletin, qui repasse ensuite en attente de validation.

## NOTE-020 — Historique des modifications

Toutes les créations et modifications de notes sont historisées avec les informations nécessaires à l'audit, notamment l'auteur, la date, l'ancienne valeur et la nouvelle valeur.

## NOTE-021 — Modes de saisie

La saisie des notes est disponible sous deux formes :

- une grille de saisie de type tableau ;
- une saisie depuis la fiche individuelle de l'élève.

## NOTE-022 — Publications indépendantes

Les notes individuelles, les moyennes de période et les bulletins disposent de publications distinctes.

Une note peut donc être publiée alors que la moyenne ou le bulletin ne l'est pas encore.

## NOTE-023 — Dépublication

Une note, une moyenne ou un bulletin publié peut être dépublié par un utilisateur autorisé.

La dépublication et les éventuelles corrections restent historisées.

## NOTE-024 — Rattrapage

Une note de rattrapage ne remplace pas physiquement la note initiale.

Les deux notes sont conservées et la nouvelle note porte explicitement la mention « rattrapage ».

## NOTE-025 — Classements

Les rangs sont calculés par période à partir de la moyenne générale.

Le classement par matière ne fait pas partie du périmètre validé de la V1.

## NOTE-026 — Séparation du calcul et de l'appréciation

La formule produit uniquement une valeur numérique.

L'appréciation intervient après le calcul et interprète la valeur obtenue. Elle ne fait pas partie de la formule.

## NOTE-027 — Grille d'appréciation de l'établissement

La grille d'appréciation est définie au niveau de l'établissement.

Chaque intervalle de résultat produit un libellé paramétrable.

## NOTE-028 — Appréciations proposées et modifiables

GeeCole peut proposer automatiquement une appréciation issue de la grille.

L'utilisateur autorisé peut conserver, modifier ou remplacer cette proposition.

## NOTE-029 — Niveaux d'appréciation

Le système distingue :

- l'appréciation associée à une note ;
- l'appréciation d'une matière sur le bulletin ;
- l'appréciation générale de la période.

## NOTE-030 — Règles de rédaction des appréciations

Le rôle autorisé à rédiger l'appréciation générale est configurable par établissement.

Le caractère obligatoire ou facultatif des appréciations est également configurable.

## NOTE-031 — Types de documents pédagogiques

GeeCole fournit un catalogue activable et extensible comprenant notamment :

- le bulletin trimestriel ;
- le bulletin semestriel ;
- le bulletin annuel ;
- le relevé de notes ;
- l'attestation de réussite.

## NOTE-032 — Catalogue des décisions scolaires

GeeCole fournit un catalogue de décisions scolaires adapté au contexte guinéen, par exemple admission, redoublement, ajournement, exclusion, réorientation, abandon ou décision différée.

L'établissement peut activer les décisions utiles et compléter le catalogue.

## NOTE-033 — Mentions

Les mentions sont calculées automatiquement à partir d'une grille paramétrable par l'établissement.

## NOTE-034 — Signatures des bulletins

Les signataires sont définis par rôles configurables, par exemple direction, direction des études ou professeur principal.

Le modèle du bulletin détermine les emplacements des signatures.

## NOTE-035 — Modèles de bulletins

Un établissement peut utiliser plusieurs modèles de bulletins.

Un modèle peut notamment définir la mise en page, les informations affichées, le logo, les couleurs, les tableaux, les statistiques et les emplacements de signature.

## NOTE-036 — Proposition et validation du passage

GeeCole propose une décision de passage à partir de la moyenne générale et de règles paramétrables par l'établissement.

La décision finale doit être validée par le conseil de classe ou par un utilisateur disposant du rôle configuré à cet effet.

## NOTE-037 — Réinscription, promotion et exceptions

La réinscription peut être réalisée individuellement ou en masse.

La promotion en masse permet de faire passer les élèves admis vers l'année ou le niveau suivant, tout en traitant individuellement les exceptions telles que redoublement, réorientation, abandon ou exclusion du traitement.

## NOTE-038 — Historique scolaire permanent

L'historique scolaire d'un élève est conservé sans suppression.

Il comprend au minimum l'établissement, l'année scolaire, le niveau, la classe, les résultats, la décision scolaire et les bulletins associés.

## NOTE-039 — Examens nationaux — périmètre V1

GeeCole couvre uniquement la préparation administrative et le suivi des examens nationaux au niveau de l'établissement.

La V1 permet notamment :

- la préparation des listes de candidats ;
- la gestion des numéros de candidat et de table ;
- la gestion des centres d'examen ;
- l'export des listes administratives ;
- la saisie manuelle ou l'import Excel/CSV des résultats officiels ;
- l'archivage permanent des résultats ;
- la génération des attestations, relevés, certificats et autres documents configurés.

La V1 ne gère pas l'organisation opérationnelle complète des examens nationaux, notamment les jurys, l'anonymat des copies, la surveillance, les délibérations nationales ou le pilotage ministériel.
