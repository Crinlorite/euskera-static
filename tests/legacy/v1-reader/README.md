# Lector antiguo congelado (v1, antes de la fase 0) — NO EDITAR

Copias literales del código de progreso tal como estaba antes del endurecimiento
del 31-oct-2026 (commit `1826a77`, el último con el código antiguo):

- `progress-hash.ts` y `progress-merge.ts`: copiados byte a byte de `src/stores/`;
  lo único cambiado es la línea del `import type`, que apunta a `./types.ts`.
- `migrate.ts`: `emptyProgress()`, `LEGACY_UNIT_SLUG_TO_ID`, `migrateLegacyLessonKey()`
  y `migrate()` de `src/stores/progress.ts`.
- `types.ts`: los tipos de `src/stores/progress.ts` de entonces.

Simulan a un cliente con el JS viejo en caché (service worker, app sin actualizar).
`tests/compat.test.mjs` comprueba que lo que escribe el código nuevo lo sigue
entendiendo este lector sin perder nada. Si se editan, la prueba deja de valer.
