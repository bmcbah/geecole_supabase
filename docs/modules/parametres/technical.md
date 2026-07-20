# Paramètres — Technique

# Paramétrage — Spécifications techniques

- React, TypeScript et PrimeReact.
- Supabase Auth, PostgreSQL, RPC transactionnelles et RLS.
- `cycle_catalog` contient le référentiel évolutif.
- `institution_cycles` contient les activations par établissement.
- Les tables `academic_year_*` portent la configuration et les instantanés annuels.
- Les écritures sensibles sont autorisées aux rôles owner/admin.
- Parent et élève ne changent pas le contexte annuel.
- Les contraintes critiques existent en base et ne reposent jamais uniquement sur l'UI.
- Les migrations sont couvertes par pgTAP.


Le paramétrage intelligent s’applique au frontend, aux API, aux validations, à la RLS, aux imports et aux exports.
