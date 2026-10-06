-- Contador del botón «Me interesa» de Kaixo Jolas.
-- Una cifra por día (UTC), idioma y origen (web, ios, android). Nada más:
-- ni correo, ni IP, ni user agent, ni identificador (decisión del 6-oct-2026).
-- Sustituye a la tabla `waitlist` (correos) de la rama `plus`, que nunca se publicó.
CREATE TABLE IF NOT EXISTS interes (
  dia    TEXT NOT NULL,
  locale TEXT NOT NULL,
  origen TEXT NOT NULL,
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, locale, origen)
);
