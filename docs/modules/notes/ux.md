# Notes — Parcours et écrans

## Pages du module

1. Tableau de bord Notes
2. Mes cours
3. Cahier de notes
4. Notes par élève
5. Suivi de saisie
6. Contrôle des moyennes
7. Affectations pédagogiques

Les types de note, les formules et les paramètres pédagogiques sont configurés
dans le module Paramétrage.

Les pages et données visibles dépendent des permissions.

## Gestion opérationnelle des périodes

L'ouverture et la clôture des saisies sont réalisées dans une page dédiée,
organisée par cycle et présentée sous forme de frise. Le cahier des notes ne
permet pas de modifier l'état d'une période : il affiche seulement un indicateur
compact `À venir`, `Saisies ouvertes` ou `Clôturée`.

## Tableau de bord

### Enseignant

- cours affectés ;
- notes à compléter ;
- résultats reportés ;
- cahiers incomplets ;
- périodes proches de la clôture ;
- bulletins bloqués par ses cours.

### Responsable pédagogique ou direction

- progression par cycle, niveau, classe et matière ;
- enseignants en retard ;
- cours sans coefficient ;
- résultats reportés ;
- classes prêtes ou bloquées.

## Mes cours

Une carte de cours affiche :

- matière ;
- classe ou niveau ;
- période ;
- coefficient ;
- nombre de notes ;
- progression ;
- moyenne de classe ;
- blocages.

## Cahier de notes en TreeView — page centrale

Le cahier est la page principale de gestion de toutes les notes de l’école. Le
parcours visible est : choisir un cours, saisir les résultats, compléter les
appréciations, contrôler les moyennes puis générer les bulletins.

Le cahier utilise des filtres globaux distincts du panneau hiérarchique. Le cycle,
la période, le niveau et la classe sont sélectionnés sur une seule ligne hors du TreeView. Le TreeView conserve
une seule recherche interne et affiche uniquement `Niveau → Classe → Cours`.

```text
Filtres globaux : Cycle | Période | Niveau | Classe
Recherche dans l’arbre : niveau, cours ou enseignant
└── Niveau
    └── Classe
        └── Cours
```

### Adaptation par profil

- enseignant : uniquement ses cours ;
- enseignant principal : ses cours et vue consolidée de sa classe ;
- responsable de cycle : son cycle ;
- direction : toute l’école.

### Fonctions du TreeView

- recherche unique par niveau, matière ou enseignant ;
- filtres globaux cycle, période et classe hors du TreeView ;
- badges d’état ;
- compteurs d’anomalies ;
- mémorisation du dernier cours ouvert ;
- expansion automatique du chemin actif ;
- chargement progressif ;
- menu contextuel selon permission.

Badges :

- À démarrer
- En cours
- Incomplet
- Reporté
- Prêt
- Publié

## Zone du cours sélectionné

En-tête :

- matière ;
- classe ;
- période ;
- enseignant ;
- coefficient ;
- formule ;
- progression ;
- alertes.

La zone ne contient aucun onglet de navigation. Elle présente les actions du
cours. Les moyennes, appréciations et historiques sont ouverts comme pages de
travail dédiées ou comme actions contextuelles.

## Grille du cahier

Lignes : élèves. Colonnes : notes.

Colonnes fixes :

- sélection ;
- matricule ;
- élève ;
- moyenne matière ;
- appréciation ;
- statut.

Chaque colonne de note montre :

- libellé ;
- type ;
- date ;
- barème hérité ;
- résultat ou statut.

Actions :

- ajouter une note ;
- saisir ou coller des résultats ;
- appliquer un statut en masse ;
- modifier libellé ou date ;
- publier les notes ;
- consulter l’historique.

Le libellé affiché dans l’interface est **Journal des modifications**. Il sert à
retracer les créations, changements et publications ; ce n’est pas une page de
navigation.

La **saisie en masse** accepte le collage de deux colonnes depuis un tableur :
matricule et résultat. Les valeurs Absent, Dispensé et Reporté sont acceptées.

Une **appréciation** est un commentaire pédagogique par élève et matière. Elle
est saisie dans la dernière partie du cahier et reprise dans le bulletin.

Un **rattrapage à compléter** est un résultat marqué Reporté. Tant qu’il n’est
pas remplacé par une note ou un statut définitif, la moyenne et le bulletin de
l’élève sont bloqués.

Une seule période peut être ouverte par cycle. Son ouverture, sa clôture et sa
réouverture se font **uniquement** dans la page **Gestion des périodes**. Le
cahier affiche l’état en lecture seule et conditionne les actions de saisie.

La période affichée est résolue automatiquement depuis le cycle de la classe ou
du niveau. Le changement de cours recalcule les périodes disponibles.

La grille utilise des colonnes figées et une navigation clavier.

## Formulaire Ajouter une note

Champs :

- libellé ;
- type de note ;
- date ;
- commentaire interne facultatif.

Hérités et non modifiables :

- cours ;
- classe ;
- matière ;
- période ;
- barème.

## Notes par élève

Accessible depuis le profil ou le cahier :

- cours et matières ;
- résultats et statuts ;
- moyennes ;
- appréciations ;
- historique ;
- bulletins publiés.

## Suivi de saisie

Vue hiérarchique :

```text
École → Cycle → Niveau → Classe → Matière → Enseignant
```

Indicateurs :

- taux de complétude ;
- notes manquantes ;
- résultats reportés ;
- appréciations manquantes ;
- dernière modification ;
- responsable du blocage.

## Contrôle des moyennes

Affiche sans modification directe :

- moyenne par type ;
- formule appliquée ;
- moyenne matière ;
- coefficient ;
- contribution à la moyenne générale ;
- anomalies.

Le contrôle est filtré par période et présente aussi les notes manquantes, les
résultats reportés, les absences, les dispenses et la raison précise d’un
blocage. Une ligne sans évaluation ou avec résultat reporté n’est jamais déclarée
prête.

## Appréciations

La page présente tous les couples élève–matière attendus pour la période, y
compris lorsqu’aucune appréciation n’a encore été saisie. Elle permet la création
et la modification sur place et affiche un état de complétude.

## Navigation détaillée par profil

Voir [Navigation par profil](navigation.md).
