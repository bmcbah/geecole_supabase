# Fixtures de développement et de recette

Les fixtures sont des données de démonstration. Elles ne font pas partie du catalogue GeEcole et ne sont jamais chargées automatiquement par les migrations ou `supabase db reset`.

## Chargement explicite

```bash
npm run supabase:fixtures
```

Le chargeur utilise la base Supabase locale. `SUPABASE_DB_URL` permet de cibler explicitement une base non locale.

## Garde-fous

- `GEECOLE_ENV=production` ou `prod` provoque toujours un refus.
- En `staging` ou `recette`, `GEECOLE_FIXTURES_CONFIRM=LOAD_FIXTURES` est obligatoire.
- Le catalogue de référence reste dans les migrations ; seuls les établissements, utilisateurs et scénarios de démonstration résident dans `supabase/fixtures/`.
