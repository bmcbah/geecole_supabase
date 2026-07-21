# Notes & Bulletins — Navigation par profil

## 1. Principe général

La navigation suit systématiquement cette structure :

```text
Module
→ Fonctionnalité
→ Page de travail
```

Le module principal est :

```text
Notes & Bulletins
```

Les fonctionnalités métier sont :

```text
Notes & Bulletins
├── Gestion des périodes
├── Cahiers de notes
├── Rattrapages à compléter
├── Appréciations
├── Contrôle des moyennes
├── Générations
├── Bulletins
├── Validation
├── Publication
├── Historique
└── Affectations pédagogiques
```

Les éléments visibles dépendent des permissions de l’utilisateur.

Le TreeView sert à sélectionner le contexte. Il ne remplace pas la page de travail.

---

## 2. Navigation globale

```text
Notes & Bulletins
│
├── Gestion des périodes
├── Cahiers de notes
├── Rattrapages à compléter
├── Appréciations
├── Contrôle des moyennes
├── Générations
├── Bulletins
├── Validation
├── Publication
├── Historique
└── Affectations pédagogiques
```

Les types de note, les formules de calcul et les paramètres pédagogiques sont
accessibles dans le module **Paramétrage**. Les modèles propres au rendu des
bulletins restent dans le module Bulletins.

La configuration des périodes (libellé, ordre et dates) reste dans Paramétrage.
Leur pilotage opérationnel (ouverture et clôture des saisies) se fait uniquement
dans **Notes & Bulletins → Gestion des périodes**.

### Gestion des périodes

La page présente l'année active et une frise distincte par cycle. Elle indique
la période courante, les périodes à venir et clôturées, ainsi que leurs dates.
Une seule période peut être ouverte simultanément pour un cycle.

Les actions d'ouverture et de clôture sont réservées aux profils de direction
autorisés. Le cahier affiche l'état de la période en lecture seule et ne porte
aucune action de changement d'état.

---

## 3. Pages de travail

Les pages génériques « Vue d’ensemble » et « Suivi pédagogique » sont retirées.
Chaque entrée ouvre une page de travail normalisée : PageHeader, actions contextuelles,
barre d’outils et DataTable. La génération est un workflow par lots avec portée,
contrôles, blocages, validation, publication et historique des versions.

---

## 4. Cahiers de notes

### 4.1 Mes cours

#### Navigation

```text
Notes & Bulletins
→ Cahiers de notes
→ Mes cours
```

#### Profils

- enseignant ;
- enseignant principal ;
- intervenant spécialisé.

#### Page de travail

La page n’affiche que les cours issus des affectations de l’utilisateur.

Modes possibles :

```text
[Arbre] [Cartes]
```

Le mode TreeView est recommandé par défaut.

```text
2026–2027
└── Période 1
    ├── Mathématiques — 7A
    ├── Mathématiques — 7B
    └── Sport — CM1
```

La sélection d’un cours ouvre le cahier dans la zone de travail.

---

### 4.2 Tous les cahiers

#### Navigation

```text
Notes & Bulletins
→ Cahiers de notes
→ Tous les cahiers
```

#### Profils

- responsable pédagogique ;
- responsable de cycle ;
- direction ;
- administrateur autorisé.

#### Page de travail

```text
Filtres globaux : Cycle → Période → Classe
TreeView : Niveau → Classe → Cours
```

Exemple :

```text
Cycle : Collège | Période : Période 1 | Classe : Toutes
▼ 7e année
  ▼ 7A
    ● Mathématiques — E1
    ● Français — E2
    ● Histoire — E3
```

Badges de statut :

- À démarrer
- En cours
- Incomplet
- Reporté
- Prêt
- Publié

---

### 4.3 Page de travail du cahier

```text
┌──────────────────┬─────────────────────────────────────────┐
│ TreeView         │ En-tête du cours                        │
│                  │ Mathématiques • 7A • Période 1          │
│ Année            │ Enseignant E1 • Coefficient 4           │
│  └ Période       ├─────────────────────────────────────────┤
│    └ Cycle       │ Actions du cours                        │
│      └ Classe    │ Ajouter • Saisir • Statut • Publier     │
│        └ Cours   ├─────────────────────────────────────────┤
│                  │ Grille de travail                       │
│                  │ Élève | DS1 | Oral | Composition | Moy. │
└──────────────────┴─────────────────────────────────────────┘
```

Actions principales :

```text
[Ajouter une note]
[Saisir les résultats]
[Appliquer un statut]
[Publier les notes]
[Voir l’historique]
```

---

### 4.4 Notes par élève

#### Navigation

```text
Notes & Bulletins
→ Cahiers de notes
→ Notes par élève
```

#### Page de travail

```text
Cycle
→ Niveau
→ Classe
→ Élève
```

La page affiche :

- cours ;
- notes ;
- résultats ;
- statuts ;
- moyennes ;
- appréciations ;
- historique ;
- bulletins publiés.

Actions selon permissions :

```text
[Ajouter une note individuelle]
[Compléter un résultat]
[Ajouter une appréciation]
[Voir le bulletin]
```

---

### 4.5 Rattrapages à compléter

#### Navigation

```text
Notes & Bulletins
→ Cahiers de notes
→ Rattrapages à compléter
```

#### Page de travail

| Élève     | Classe | Cours         | Note        | Impact          | Action    |
| --------- | ------ | ------------- | ----------- | --------------- | --------- |
| Fatou Sow | 7A     | Mathématiques | Composition | Bulletin bloqué | Compléter |
| Ali Touré | 7B     | Français      | Oral        | Moyenne bloquée | Compléter |

L’enseignant voit uniquement ses cours. La supervision voit son périmètre.

---

## 5. Suivi pédagogique

### 5.1 Suivi de saisie

#### Navigation

```text
Notes & Bulletins
→ Suivi pédagogique
→ Suivi de saisie
```

#### Profils

- enseignant principal ;
- responsable pédagogique ;
- responsable de cycle ;
- direction.

#### Page de travail

```text
École
→ Cycle
→ Niveau
→ Classe
→ Matière
→ Enseignant
```

Exemple :

```text
▼ Collège                         82 % complété
  ▼ 7e année                     76 % complété
    ▼ 7A                         91 % complété
      ✓ Mathématiques            Prêt
      ! Français                 2 reportés
      ● Histoire                 En cours
```

La zone droite affiche :

- nombre de notes ;
- taux de saisie ;
- appréciations manquantes ;
- résultats reportés ;
- dernière modification ;
- responsable du blocage.

---

### 5.2 Contrôle des moyennes

#### Navigation

```text
Notes & Bulletins
→ Suivi pédagogique
→ Contrôle des moyennes
```

#### Page de travail

```text
Période
→ Classe
→ Élève
```

| Matière       | Moyenne | Coefficient | Contribution | État     |
| ------------- | ------: | ----------: | -----------: | -------- |
| Mathématiques |      15 |           4 |           60 | Calculée |
| Français      |      12 |           3 |           36 | Calculée |
| Histoire      |       — |           2 |            — | Reporté  |

Actions :

```text
[Voir le détail du calcul]
[Ouvrir le cahier]
[Ouvrir le résultat bloquant]
```

---

### 5.3 Appréciations

#### Navigation

```text
Notes & Bulletins
→ Suivi pédagogique
→ Appréciations
```

#### Page de travail

Deux vues :

```text
[Par cours] [Par élève]
```

Vue par cours :

| Élève      | Moyenne | Appréciation | État      |
| ---------- | ------: | ------------ | --------- |
| Awa Diallo |      15 | Bon travail  | Complète  |
| Fatou Sow  |      11 | —            | Manquante |

Vue par élève : toutes les appréciations destinées au bulletin.

---

### 5.4 Anomalies et blocages

#### Navigation

```text
Notes & Bulletins
→ Suivi pédagogique
→ Anomalies et blocages
```

#### Page de travail

Catégories :

- résultats reportés ;
- cours sans coefficient ;
- cours sans enseignant ;
- formule manquante ;
- moyenne non calculable ;
- appréciation obligatoire manquante ;
- incohérence de barème.

Chaque anomalie renvoie vers la page source à corriger.

---

## 6. Bulletins

### 6.1 Générations

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Générations
```

#### Page de travail

| Période   | Périmètre | Élèves | Statut  | Date  | Actions      |
| --------- | --------- | -----: | ------- | ----- | ------------ |
| Période 1 | Collège   |    248 | Terminé | 15/12 | Voir rapport |
| Période 1 | Primaire  |    310 | Partiel | 16/12 | Reprendre    |

Action principale :

```text
[Générer des bulletins]
```

---

### 6.2 Assistant de génération

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Générations
→ Générer des bulletins
```

#### Page de travail

```text
1. Période
2. Périmètre
3. Contrôles
4. Options
5. Confirmation
```

Périmètres :

- toute l’école ;
- cycles ;
- niveaux ;
- classes ;
- élèves.

Le formulaire est dynamique.

---

### 6.3 Rapport de génération

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Générations
→ Rapport
```

#### Page de travail

```text
235 générés
8 avec avertissement
13 bloqués
```

Actions :

```text
[Voir le bulletin]
[Ouvrir le cahier]
[Ouvrir l’affectation]
[Corriger]
[Relancer]
```

---

### 6.4 Liste des bulletins

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Bulletins
```

#### Page de travail

Filtres :

- année ;
- période ;
- cycle ;
- niveau ;
- classe ;
- élève ;
- statut ;
- version.

Statuts :

- Non calculable
- À compléter
- Généré
- À valider
- Validé
- Publié
- Remplacé

---

### 6.5 Validation

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Validation
```

#### Page de travail

Actions :

```text
[Prévisualiser]
[Valider]
[Rejeter avec motif]
[Valider la sélection]
```

Une seule validation est nécessaire.

---

### 6.6 Publication

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Publication
```

#### Page de travail

Canaux configurables :

- espace parent ;
- espace élève ;
- téléchargement PDF ;
- impression ;
- courriel.

Actions :

```text
[Publier la sélection]
[Programmer la publication]
[Télécharger]
```

---

### 6.7 Historique

#### Navigation

```text
Notes & Bulletins
→ Bulletins
→ Historique
```

#### Page de travail

```text
Élève
└── Période 1
    ├── Version 1 — publiée
    └── Version 2 — publiée après correction
```

Chaque version affiche :

- générateur ;
- validateur ;
- publicateur ;
- dates ;
- motif ;
- PDF ;
- données figées.

---

## 7. Affectations et paramétrage

### 7.1 Affectations pédagogiques

#### Navigation

```text
Notes & Bulletins
→ Affectations pédagogiques
```

#### Page de travail

```text
Enseignant
→ Matière
→ Classe ou niveau
→ Toute l’année ou périodes
→ Coefficient
```

Pour le primaire :

```text
Enseignant principal
→ Classe
→ Plusieurs matières
→ Toute l’année
```

Les enseignants spécialisés peuvent être affectés à certains cours.

---

### 7.2 Types de note

#### Navigation

```text
Paramétrage
→ Types de note
```

#### Page de travail

| Type        | Barème | Utilisé | Actif | Action    |
| ----------- | -----: | ------- | ----- | --------- |
| Évaluation  |    /20 | Oui     | Oui   | Consulter |
| Composition |   /100 | Oui     | Oui   | Consulter |
| Oral        |    /20 | Non     | Oui   | Modifier  |

Le barème devient immuable après la première utilisation.

---

### 7.3 Formules de calcul

#### Navigation

```text
Paramétrage
→ Formules de calcul
```

#### Page de travail

```text
Établissement
→ Cycle
→ Niveau
→ Matière
→ Période
```

Exemple :

```text
Mathématiques
40 % Devoirs
20 % Oraux
40 % Composition
```

La provenance de la règle reste visible :

```text
Héritée de : Cycle Collège
```

---

### 7.4 Modèles de bulletin

#### Navigation

```text
Bulletins
→ Modèles de bulletin
```

#### Page de travail

- liste des modèles ;
- aperçu ;
- affectation par cycle ou niveau ;
- données affichées ;
- signatures ;
- langue ;
- statut actif.

---

### 7.5 Paramètres

#### Navigation

```text
Paramétrage
→ Paramètres pédagogiques
```

#### Page de travail

- profils autorisés à valider ;
- profils autorisés à publier ;
- appréciations obligatoires ;
- affichage du rang ;
- affichage des coefficients ;
- règles d’arrondi ;
- notifications ;
- comportements par cycle.

---

## 8. Navigation par profil

### Enseignant

```text
Notes & Bulletins
├── Vue d’ensemble
├── Cahiers de notes
│   ├── Mes cours
│   ├── Notes par élève
│   └── Résultats reportés
└── Suivi pédagogique
    ├── Mes appréciations
    └── Mes moyennes
```

Page principale :

```text
Mes cours → TreeView → Cahier sélectionné
```

### Enseignant principal

```text
Notes & Bulletins
├── Vue d’ensemble
├── Cahiers de notes
│   ├── Mes cours
│   ├── Ma classe
│   └── Notes par élève
├── Suivi pédagogique
│   ├── Suivi de ma classe
│   ├── Appréciations
│   └── Contrôle des moyennes
└── Bulletins
    └── Consultation
```

### Responsable pédagogique ou de cycle

```text
Notes & Bulletins
├── Vue d’ensemble
├── Cahiers de notes
│   └── Tous les cahiers de son périmètre
├── Suivi pédagogique
│   ├── Suivi de saisie
│   ├── Contrôle des moyennes
│   ├── Appréciations
│   └── Anomalies
├── Bulletins
│   ├── Générations
│   ├── Bulletins
│   └── Validation, si autorisée
└── Affectations pédagogiques, si autorisées
```

### Direction

```text
Notes & Bulletins
├── Vue d’ensemble
├── Cahiers de notes
├── Suivi pédagogique
├── Bulletins
│   ├── Générations
│   ├── Validation
│   ├── Publication
│   └── Historique
└── Affectations pédagogiques, si autorisées
```

### Administrateur

```text
Notes & Bulletins
├── Vue d’ensemble technique
├── Affectations pédagogiques
└── Audit et historique
```

L'administrateur accède aux types de note, formules et paramètres pédagogiques
depuis le module Paramétrage, selon ses permissions.

L’administrateur ne reçoit pas automatiquement le droit de modifier les résultats pédagogiques.

---

## 9. Règle UX finale

```text
Module
→ Fonctionnalité métier
→ Sélection du contexte
→ Page de travail
```

Exemples :

```text
Notes & Bulletins
→ Cahiers de notes
→ Mes cours
→ Mathématiques • 7A • Période 1
```

```text
Notes & Bulletins
→ Suivi pédagogique
→ Contrôle des moyennes
→ 7A • Awa Diallo
```

```text
Notes & Bulletins
→ Bulletins
→ Générations
→ Rapport de la génération Période 1
```

La page de travail reste stable à droite pendant que le TreeView permet de changer rapidement de contexte.
