# Personnel — Règles métier

# Module Personnel — Décisions métier validées

Ce document consigne uniquement les décisions fonctionnelles validées pour le module Personnel.

## PER-001 — Périmètre

Toute personne travaillant pour un établissement doit être enregistrée dans le module Personnel, y compris la direction, les enseignants, l'administration, la comptabilité, la surveillance, le personnel de soutien, les intervenants externes et les stagiaires.

Chaque fiche est caractérisée notamment par un état et une ou plusieurs fonctions.

## PER-002 — Séparation avec les autres profils métier

Une personne déjà enregistrée comme parent ou dans un autre profil métier doit être recréée dans le module Personnel lorsqu'elle devient membre du personnel.

Les fiches métier restent distinctes. Lorsqu'un parent possède une adresse e-mail, un compte invité peut lui être créé indépendamment de sa fiche Personnel.

## PER-003 — Permanence de la fiche

La fiche Personnel est permanente et n'est pas recréée à chaque année scolaire.

Son cycle de vie est géré par son état et par l'historisation de ses fonctions, situations et affectations.

## PER-004 — Multi-établissements

Une même personne peut travailler dans plusieurs établissements.

Ses fonctions, états, contrats et autres informations liées à l'emploi peuvent différer selon l'établissement.

## PER-005 — Fonctions multiples

Un membre du personnel peut exercer plusieurs fonctions simultanément.

Le système doit permettre de distinguer une fonction principale, des fonctions secondaires et, lorsque nécessaire, des responsabilités complémentaires.

## PER-006 — Catalogue des fonctions

GeeCole fournit un catalogue de fonctions prédéfini.

Chaque établissement peut activer les fonctions dont il a besoin et compléter le catalogue avec ses propres fonctions.

## PER-007 — Compte utilisateur distinct

La création d'une fiche Personnel ne crée pas automatiquement un compte utilisateur.

Le compte utilisateur est facultatif et sert uniquement à donner un accès à GeeCole. La création ou l'invitation du compte constitue une action séparée.

## PER-008 — Matricule

Le matricule du personnel est obligatoire et généré automatiquement.

Son format est paramétrable par l'établissement. Le paramétrage doit également permettre d'autoriser ou d'interdire sa modification après génération.

## PER-009 — État et fonction

L'état et la fonction sont deux notions distinctes.

L'état décrit la situation administrative de la fiche, par exemple : actif, suspendu ou sorti.

La fonction décrit le métier ou la responsabilité exercée, par exemple : enseignant, directeur, censeur, comptable, secrétaire ou surveillant.

## PER-010 — Gestion RH légère

Le module Personnel doit inclure une gestion légère des contrats, salaires, primes, avances, présences, congés et sanctions.

L'évaluation professionnelle du personnel est exclue du périmètre actuel.

Ces fonctionnalités devront être découpées en lots fonctionnels distincts lors du cadrage détaillé.

### Extension validée — paie scolaire simplifiée

La rémunération peut être fixe, horaire, à la séance, forfaitaire ou mixte. Le module calcule un
brut et un net à payer à partir du contrat, des heures validées, primes, retenues et remboursements
d'avances. Il suit les paiements partiels et produit un bulletin de rémunération.

Les heures planifiées ne sont jamais payables sans validation. Une période clôturée est immuable.
La comptabilité générale, les obligations sociales et fiscales et la paie réglementaire restent exclues.

## PER-011 — Documents administratifs

Les documents exigés pour le personnel sont paramétrables par établissement, selon le même principe que les documents demandés pour les élèves.

Le système doit permettre de définir des types de documents obligatoires ou facultatifs et de déposer les fichiers correspondants sur la fiche Personnel.

## PER-012 — Sortie du personnel

Un membre du personnel ayant un historique ne doit pas être supprimé physiquement.

Lors de sa sortie, sa fiche est conservée, son état est mis à jour et ses fonctions, situations et affectations en cours sont clôturées.

## PER-013 — Condition d'éligibilité à l'enseignement

Seul un membre du personnel disposant d'une fonction active de type Enseignant peut recevoir une affectation pédagogique.

La présence d'un compte utilisateur n'est pas obligatoire pour recevoir cette affectation.
