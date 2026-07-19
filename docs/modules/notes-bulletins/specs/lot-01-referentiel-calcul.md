# Lot 1 — Référentiel pédagogique et formules de calcul

## Objectif

Fournir aux établissements les référentiels nécessaires à la saisie des notes et au calcul des moyennes, sans imposer de règle pédagogique propre à GeeCole.

## Décisions fonctionnelles validées

### Contexte annuel

- L’année scolaire est toujours fournie par le contexte global de l’application.
- Elle n’est pas redemandée dans les écrans des types d’évaluation, formules, affectations, notes ou bulletins.
- Une année clôturée ou archivée reste consultable en lecture seule.

### Types d’évaluation

- Un type d’évaluation est un élément descriptif du catalogue de l’établissement.
- Il contient un nom, un code, une description, une icône, une couleur, un barème par défaut, un ordre et un statut.
- Le type d’évaluation ne porte aucune pondération métier.
- L’ancienne colonne `weight` est conservée temporairement avec la valeur neutre `1` uniquement pour la compatibilité technique.

### Propriété des règles de calcul

- Les formules sont créées et administrées par les écoles.
- GeeCole exécute et explique les formules, mais ne choisit pas les pondérations.
- Les poids des types d’évaluation sont définis uniquement dans une formule de calcul.
- Une école peut créer plusieurs formules pour une même année scolaire.
- Une seule formule active peut être marquée comme formule par défaut pour une année.

### Formule V1

La première version prend en charge une moyenne pondérée structurée.

Pour chaque type d’évaluation inclus, l’école définit un poids positif. Un poids nul signifie que le type ne participe pas à la formule.

Exemple :

| Type | Poids |
|---|---:|
| Devoir | 1 |
| Interrogation | 1 |
| Composition | 2 |

Les notes sont normalisées sur 20 avant application des poids lorsqu’elles utilisent des barèmes différents.

```text
moyenne = somme(note_normalisée × poids) / somme(poids)
```

### Notes manquantes

Chaque formule définit l’un des comportements suivants :

- `ignore` : les notes manquantes sont exclues du numérateur et du dénominateur ;
- `block` : le calcul est impossible tant qu’une note attendue manque.

Une absence, une dispense et une note non saisie resteront des statuts distincts dans le futur carnet de notes. Leur traduction dans le moteur de calcul sera définie dans le lot Notes.

### Prévisualisation

- L’éditeur propose un onglet de test avec des notes fictives.
- La simulation n’enregistre aucune note élève.
- Elle montre le résultat normalisé sur 20 et indique les types sans note.
- Elle applique exactement la définition structurée qui sera enregistrée.

### Versionnement

- La définition structurée est la source de vérité du calcul.
- Une modification de la définition incrémente automatiquement la version de la formule.
- Les futurs bulletins devront conserver la version de formule utilisée lors de leur génération.
- Une modification ultérieure ne devra jamais recalculer silencieusement un bulletin historique.
- La colonne historique `expression` est conservée comme représentation lisible et pour la compatibilité, mais ne pilote plus le moteur.

## Parcours UI

```text
Paramétrage
  → Types d’évaluation
  → Formules de calcul
```

L’écran Formules de calcul contient :

- une liste avec nom, code, composition, version et statut ;
- un dialog de création ou modification ;
- un tab `Configuration` ;
- un tab `Tester la formule`.

## Contrôles V1

L’enregistrement est refusé si :

- le nom est vide ;
- le code est vide ou déjà utilisé dans la même année ;
- aucun type d’évaluation n’a un poids supérieur à zéro ;
- une deuxième formule active est définie comme formule par défaut.

La suppression peut être refusée lorsqu’une formule est déjà référencée par une association pédagogique ou un bulletin.

## Hors périmètre de ce sprint

- association d’une formule à un cycle, niveau, matière ou période ;
- moteur de résolution de la formule applicable ;
- coefficients des matières dans la moyenne générale ;
- création des évaluations et saisie des notes ;
- génération et verrouillage des bulletins.

Ces éléments seront développés dans les sprints suivants du module Notes et bulletins.
