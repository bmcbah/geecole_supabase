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

## PER-014 — Workflows RH validés

Les contrats suivent le cycle brouillon, actif, terminé ou résilié. Un contrat actif déjà utilisé en paie n'est jamais réécrit : une évolution crée un avenant ou un renouvellement lié au contrat précédent. Une sortie clôture les fonctions et contrats en cours sans supprimer l'historique.

Une avance suit les états demandée, approuvée ou refusée, décaissée puis soldée. Elle peut porter un échéancier modifiable avant intégration à une paie. Les sanctions suivent brouillon, notifiée, contestée, clôturée ou annulée et conservent les décisions et justificatifs.

Les congés, absences et retards acceptent une durée en jours, demi-journées ou heures, un justificatif, une décision et un impact sur la paie configurable. Les chevauchements doivent être signalés.

## PER-015 — Paie collective et corrections

La préparation d'une période affiche les contrats manquants ou expirés, les heures non validées, les anomalies et les entrées/sorties. Les bulletins sont consultables individuellement et exportables en PDF ou ZIP par période. Les paiements peuvent être partiels ou groupés avec une référence de lot.

Après clôture, la période et ses bulletins sont immuables. Une correction ultérieure est une régularisation sur une période ouverte, explicitement typée `gain` ou `retenue` et liée à sa période d'origine.

## PER-016 — Paramétrage avancé

L'établissement configure le format du matricule, sa modifiabilité, les modes et fréquences de paiement, l'arrondi, les documents obligatoires, les seuils d'alerte, les types d'absence et leur impact, ainsi que la présentation du bulletin. La devise du périmètre actuel est le franc guinéen (GNF).

## PER-017 — Sécurité reportée

La matrice des profils, capacités et autorisations fines fera l'objet d'un cadrage séparé. Les protections existantes restent provisoires et ne doivent pas être présentées comme le modèle cible.

## PER-018 — Contrat explicite

Le contrat porte la base de rémunération utilisée par la paie. Un contrat horaire exige un taux horaire de base et des heures hebdomadaires prévues. Un contrat fixe avec heures exige le salaire fixe, le taux horaire de base et les heures hebdomadaires prévues. Le taux du contrat ne doit pas être remplacé implicitement par un taux défini ailleurs sur la fiche.
