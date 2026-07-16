# GeeCole

Application de gestion scolaire destinée en priorité aux établissements guinéens. Ce dépôt est développé fonctionnalité par fonctionnalité ; `main` ne reçoit que du code validé.

## Prérequis

- Node.js 22+
- Docker
- Supabase CLI

## Démarrage local

```bash
npm install
supabase start
cp .env.example .env.local
```

Copiez ensuite l'URL API et la clé `anon` affichées par `supabase status` dans `.env.local`, puis lancez :

```bash
npm run supabase:reset
npm run dev
```

Supabase Studio est disponible par défaut sur `http://127.0.0.1:54323`.

## Qualité

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run supabase:test
```

## Types Supabase

Après chaque modification du schéma :

```bash
supabase gen types typescript --local > src/shared/lib/supabase/database.types.ts
```

Le fichier généré doit être inclus dans le même commit que la migration.

## Sécurité

- La clé `service_role` et le mot de passe PostgreSQL ne vont jamais dans le frontend.
- Toutes les tables exposées utilisent RLS.
- Les migrations déjà partagées ne sont pas modifiées : une nouvelle migration corrective est créée.
