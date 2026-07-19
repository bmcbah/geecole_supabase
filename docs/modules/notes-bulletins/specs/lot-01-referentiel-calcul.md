# Lot 1 — Référentiel pédagogique et formules de calcul

## Objectif

Permettre aux établissements de définir leurs propres règles de calcul sans imposer de pondérations ou de modèle pédagogique GeeCole.

## Décisions fonctionnelles validées

### Contexte annuel

- L’année scolaire vient du contexte global de l’application.
- Elle n’est jamais redemandée dans les écrans du module.
- Une année clôturée ou archivée reste consultable en lecture seule.

### Types d’évaluation

- Un type d’évaluation est descriptif.
- Il contient un nom, un code, une description, une icône, une couleur, un barème par défaut, un ordre et un statut.
- Son code devient une variable utilisable dans les formules, par exemple `EVAL`, `COMP`, `ORAL`.
- Il ne porte aucune pondération métier.
- L’ancienne colonne `weight` est conservée temporairement à `1` uniquement pour compatibilité.

### Propriété des règles de calcul

- Les formules appartiennent aux écoles.
- GeeCole valide, exécute et explique la formule, mais ne choisit pas la règle.
- L’expression écrite par l’établissement est la source de vérité fonctionnelle.
- Exemple :

```text
(EVAL + COMP * 2) / 3
```

- `EVAL` représente la moyenne normalisée des évaluations dont le type porte le code `EVAL`.
- `COMP` représente la moyenne normalisée des évaluations dont le type porte le code `COMP`.

### Langage de formule V1

La V1 accepte uniquement :

- les codes des types d’évaluation actifs ;
- les nombres entiers ou décimaux ;
- les opérateurs `+`, `-`, `*`, `/` ;
- les parenthèses ;
- le signe moins unaire.

Les fonctions avancées (`AVG`, `SUM`, `MIN`, `MAX`, `IF`) sont hors périmètre de la V1.

### Validation

L’enregistrement est refusé si :

- la formule est vide ;
- un caractère non autorisé est utilisé ;
- une parenthèse manque ;
- un code ne correspond à aucun type d’évaluation actif ;
- l’expression est incomplète ;
- une division par zéro est détectée lors de la validation ou de la simulation ;
- le nom ou le code de la formule est vide ;
- le code de formule est déjà utilisé dans la même année ;
- une deuxième formule active est définie comme formule par défaut.

### Notes manquantes

Chaque formule choisit une règle :

- `block` : le calcul est impossible tant qu’une variable utilisée n’a pas de valeur ;
- `ignore` en V1 : une variable sans valeur est remplacée par `0`.

Cette règle sera affinée avec les statuts `absent`, `dispensé` et `non noté` dans le lot Notes.

### Simulation et explication

- L’éditeur comporte les tabs `Configuration` et `Tester la formule`.
- Le test utilise des valeurs fictives par variable.
- La simulation affiche l’expression résolue et le résultat.
- Elle ne crée aucune note élève.
- Les erreurs sont affichées avant l’enregistrement.

### Stockage et versionnement

- `grading_formulas.expression` contient la formule métier et pilote le moteur.
- `grading_formulas.definition` contient uniquement les métadonnées compilées : version du langage, variables détectées et politique de valeurs manquantes.
- Une modification de l’expression ou de sa définition incrémente la version.
- Les futurs bulletins conserveront l’identifiant et la version réellement utilisés.
- Un bulletin historique ne doit jamais être recalculé silencieusement avec une nouvelle version.

## Affectation des formules

Une formule peut être affectée à un ou plusieurs périmètres :

- cycle ;
- niveau annuel ;
- matière annuelle ;
- période.

Au moins un périmètre doit être renseigné.

### Représentation des périodes

- Le schéma actuel ne possède pas de table autonome `academic_periods`.
- Une période est donc stockée dans une affectation par un code stable, par exemple `T1`, `T2`, `S1` ou `P1`.
- Le code est issu de la configuration du cycle annuel et n’est pas une clé étrangère.
- Cette décision évite de créer une dépendance vers une table inexistante et reste compatible avec les cycles en trimestres, semestres ou périodes personnalisées.

### Règle de résolution

GeeCole retient l’affectation active la plus spécifique compatible avec le contexte courant.

Ordre de spécialisation :

1. période + matière + niveau + cycle ;
2. matière + niveau + cycle ;
3. niveau + cycle ;
4. cycle ;
5. formule active par défaut de l’année si aucune affectation ne correspond.

Une affectation plus spécifique remplace une affectation plus générale. Deux affectations actives ne peuvent pas avoir exactement le même périmètre.

## Parcours UI

```text
Paramétrage
  → Types d’évaluation
  → Formules de calcul
      → Formules
      → Affectations
```

L’écran affiche désormais les formules puis le panneau d’affectation avec cycle, niveau, matière et code période.

## Décision technique sur les migrations

- Chaque fichier de migration Supabase doit posséder une version unique dans son nom.
- Les migrations `structure_grading_formulas` et `create_grading_formula_assignments` utilisaient initialement la même version `20260719190000`.
- La migration des affectations a été renommée `20260719191000` afin d’éviter un conflit dans `supabase_migrations.schema_migrations`.

## Hors périmètre restant

- agrégation réelle des évaluations d’un élève par code de type ;
- création des évaluations et saisie des notes ;
- coefficients des matières dans la moyenne générale ;
- génération et verrouillage des bulletins ;
- fonctions avancées du langage de formule.
