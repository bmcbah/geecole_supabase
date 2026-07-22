# Responsive GeeCole

> **Statut : décision consolidée**

## Positionnement

GeeCole est une application métier **desktop-first**, pleinement utilisable sur tablette et consultable sur mobile.

- Desktop : expérience complète.
- Tablette : expérience complète avec disposition adaptée.
- Mobile : consultation et actions simples.
- Les workspaces très denses, comme la saisie massive de notes, la paie ou certains rapports financiers, peuvent recommander un écran plus large plutôt que proposer une version artificiellement dégradée.

## Breakpoints de référence

- Mobile : `< 640 px`
- Tablette : `640–1023 px`
- Desktop : `1024–1439 px`
- Large écran : `≥ 1440 px`

Les composants doivent aussi tenir compte de la largeur réelle de leur conteneur.

## Navigation

### Desktop

- sidebar principale permanente ;
- second menu visible ;
- mode compact autorisé.

### Tablette

- sidebar compacte ou temporaire ;
- second menu repliable.

### Mobile

- navigation masquée par défaut ;
- ouverture par bouton menu ;
- fermeture après navigation.

## WorkspaceHeader

- Desktop : titre et description à gauche, actions à droite.
- Tablette : les actions secondaires passent dans le menu `Actions`.
- Mobile : titre, description, action primaire, puis menu `⋮`.

Le titre et les actions ne doivent jamais se chevaucher.

## Filtres

- Desktop : filtres principaux sur une ligne lorsque l’espace le permet.
- Tablette : retour à la ligne contrôlé.
- Mobile : bouton `Filtres`, interface plein écran ou bloc dédié, résumé des filtres actifs et action `Réinitialiser`.

Les filtres avancés restent repliés par défaut.

## Formulaires

- Desktop : jusqu’à deux colonnes pour les champs courts.
- Tablette : une ou deux colonnes selon la largeur.
- Mobile : une seule colonne.

Sur les formulaires longs, les actions doivent rester accessibles sans masquer les champs.

## Tables

Une table ne devient pas automatiquement une liste de cards sur mobile. La stratégie est choisie explicitement :

1. **Défilement horizontal** lorsque la comparaison entre colonnes est essentielle.
2. **Colonnes prioritaires** avec masquage progressif des colonnes secondaires.
3. **Liste compacte** uniquement lorsque la comparaison tabulaire n’est pas nécessaire.

Les cahiers de notes, états financiers et grilles de paie conservent une structure tabulaire. Les colonnes d’identité importantes peuvent être figées.

## Onglets

- Desktop : onglets horizontaux.
- Mobile : défilement horizontal ; pas de retour sur plusieurs lignes.
- Les onglets moins prioritaires peuvent être regroupés sous `Plus`.

## Modales

- Desktop : tailles S, M et L.
- Tablette : largeur adaptée au viewport.
- Mobile : affichage presque plein écran, header et footer fixes, contenu défilable.

Une action complexe reste une page dédiée, même sur mobile.

## TreeView et DocumentExplorer

Sur mobile :

- navigation dossier par dossier ;
- un niveau détaillé à la fois ;
- fil d’Ariane et retour visibles ;
- actions secondaires dans `⋮`.

## Dashboard

- Large écran : quatre colonnes de KPI.
- Desktop : trois colonnes.
- Tablette : deux colonnes.
- Mobile : une colonne.

## Actions de masse

Sur mobile, la sélection affiche une barre compacte et persistante avec le nombre d’éléments sélectionnés et un menu d’actions.

## Dimensions de contrôle

Les workspaces importants sont vérifiés au minimum dans les dimensions suivantes :

- `390 × 844`
- `768 × 1024`
- `1366 × 768`
- `1920 × 1080`
