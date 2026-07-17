# Recette E2E

Les scénarios sont rangés par feature et portent les identifiants de la matrice métier (`AUTH-03`, `CYCLE-01`, etc.).

## Exécution

1. Démarrer Supabase et appliquer les migrations.
2. Définir `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `E2E_ADMIN_EMAIL` et `E2E_ADMIN_PASSWORD`.
3. Installer Chromium avec `npx playwright install chromium`.
4. Lancer `npm run test:e2e`.

Les tests authentifiés sont explicitement ignorés si les identifiants de recette ne sont pas fournis. Le test de protection des routes reste toujours exécuté.

## Règles

- données isolées par scénario ;
- aucun délai artificiel ;
- sélecteurs accessibles ou `data-testid` stables ;
- trace, capture et vidéo conservées uniquement en cas d’échec ;
- les règles critiques restent également testées dans PostgreSQL afin qu’un contournement de l’UI échoue.
