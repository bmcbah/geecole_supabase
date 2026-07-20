# Notes — Parcours et écrans

## Pages du module

1. Tableau de bord Notes
2. Mes cours
3. Cahier de notes
4. Notes par élève
5. Suivi de saisie
6. Contrôle des moyennes
7. Types de note
8. Formules de calcul
9. Affectations pédagogiques

Les pages et données visibles dépendent des permissions.

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

## Cahier de notes en TreeView

Le cahier utilise un panneau latéral hiérarchique. Une grille globale de tous les cours serait illisible.

```text
Année scolaire 2026–2027
├── Période 1
│   ├── Primaire
│   │   └── CM1
│   │       └── CM1-A
│   │           ├── Mathématiques — E1
│   │           └── Sport — E3
│   └── Collège
│       └── 7e année
│           ├── 7A
│           │   ├── Mathématiques — E1
│           │   └── Français — E2
│           └── 7B
└── Période 2
```

### Adaptation par profil

- enseignant : uniquement ses cours ;
- enseignant principal : ses cours et vue consolidée de sa classe ;
- responsable de cycle : son cycle ;
- direction : toute l’école.

### Fonctions du TreeView

- recherche par classe, matière ou enseignant ;
- filtres année, période et statut ;
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

Onglets :

- Cahier
- Appréciations
- Moyennes
- Historique

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

## Navigation détaillée par profil

Voir [Navigation par profil](navigation.md).
