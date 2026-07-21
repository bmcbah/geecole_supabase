# Personnel — Technique

Une personne peut exister comme membre du personnel avant d’avoir un compte utilisateur. Les rôles applicatifs et les fonctions RH sont distincts.

Les responsabilités annuelles sont portées par `cycle_responsibilities`. Leur typologie configurable est portée par `cycle_responsibility_types`.

Une responsabilité référence `people`, `academic_years` et `academic_cycles`. Elle ne doit pas être stockée directement sur le cycle, afin de préserver l'historique, l'intérim, les adjoints et le cumul explicite de responsabilités.
