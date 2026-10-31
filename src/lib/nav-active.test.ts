import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeNavHref, ariaCurrentFor } from './nav-active.ts';

const hrefs = ['/es/', '/es/a1/', '/es/a2/', '/es/hiztegia/', '/es/progreso/', '/es/repaso/'];

test('la portada del idioma solo se marca por igualdad exacta', () => {
  assert.equal(activeNavHref('/es/', hrefs), '/es/');
  assert.equal(ariaCurrentFor('/es/', '/es/', '/es/'), 'page');
  // Cualquier otra página empieza por /es/, pero no marca «Inicio».
  assert.equal(activeNavHref('/es/sobre/', hrefs), null);
});

test('el índice de nivel es la página exacta; sus unidades y lecciones, la sección', () => {
  assert.equal(activeNavHref('/es/a1/', hrefs), '/es/a1/');
  assert.equal(ariaCurrentFor('/es/a1/', '/es/a1/', '/es/a1/'), 'page');

  const leccion = '/es/a1/02-familia/03-posesivos/';
  const activo = activeNavHref(leccion, hrefs);
  assert.equal(activo, '/es/a1/');
  assert.equal(ariaCurrentFor(leccion, '/es/a1/', activo), 'true');
  assert.equal(ariaCurrentFor(leccion, '/es/', activo), undefined);
  assert.equal(ariaCurrentFor(leccion, '/es/a2/', activo), undefined);

  assert.equal(activeNavHref('/es/a2/01-egoerak/', hrefs), '/es/a2/');
});

test('Hiztegia, Progreso y Repaso', () => {
  assert.equal(activeNavHref('/es/hiztegia/etxe/', hrefs), '/es/hiztegia/');
  assert.equal(ariaCurrentFor('/es/hiztegia/etxe/', '/es/hiztegia/', '/es/hiztegia/'), 'true');
  assert.equal(activeNavHref('/es/progreso/', hrefs), '/es/progreso/');
  assert.equal(ariaCurrentFor('/es/progreso/', '/es/progreso/', '/es/progreso/'), 'page');
  assert.equal(activeNavHref('/es/repaso/', hrefs), '/es/repaso/');
});

test('páginas fuera del menú no marcan nada', () => {
  for (const here of ['/es/sobre/', '/es/idioma/', '/es/b1/01-x/', '/', '/es/feedback/', '/es/privacidad/']) {
    assert.equal(activeNavHref(here, hrefs), null, here);
  }
});

test('un idioma sin A2 no marca nada en /a2/', () => {
  const sinA2 = hrefs.filter((h) => h !== '/es/a2/');
  assert.equal(activeNavHref('/es/a2/', sinA2), null);
});

test('el prefijo más largo gana aunque el orden de los enlaces cambie', () => {
  const sec = ['/es/a1/', '/es/a1/02-familia/'];
  assert.equal(activeNavHref('/es/a1/02-familia/01-x/', sec), '/es/a1/02-familia/');
  assert.equal(activeNavHref('/es/a1/02-familia/01-x/', [...sec].reverse()), '/es/a1/02-familia/');
});

test('sin enlace activo no hay aria-current para nadie', () => {
  for (const h of hrefs) assert.equal(ariaCurrentFor('/es/sobre/', h, null), undefined);
});
