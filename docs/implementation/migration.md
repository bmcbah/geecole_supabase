# Stratégie de migration

La migration est additive. Les migrations déjà partagées ne sont pas réécrites. Chaque lot introduit ses nouvelles structures, reprend les données fiables, bascule les lectures puis retire la compatibilité dans un lot ultérieur.

Chaque lot doit conserver une application compilable, testable et réversible au niveau fonctionnel.
