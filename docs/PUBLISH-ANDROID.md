# Publicar Kaixo en Google Play (TWA)

Esta app se distribuye en Android como **Trusted Web Activity (TWA)** que envuelve la PWA `https://euskera.crintech.pro`. La PWA es la fuente de verdad — el TWA es un shell delgado que la sirve a pantalla completa sin barra de URL.

## Requisitos previos

- Node 20+ y `npx` (ya en el entorno del proyecto)
- JDK 17 (Temurin o JBR — Aulixa/Royal Forge ya usan esto)
- Keystore `crintechstudios.jks` (alias `upload`, password conocido)
- Cuenta de Play Console con licencia activa
- PWA verificada en producción: HTTPS, manifest válido, SW registrado, iconos 192/512/maskable
- App Signing en Play Console configurado como **Google-generated key** (recomendado — Google gestiona la release key, tú firmas con la upload key)

## 1. Identificadores

| Campo | Valor |
|---|---|
| Display name | Kaixo — Aprende euskera |
| Short name | Kaixo |
| applicationId | `com.crintechstudios.kaixo` |
| Manifest start_url | `https://euskera.crintech.pro/es/` |
| Scope | `/` |

## 2. Pasos detallados

### 2.1. Verificar la PWA en producción

```bash
# Confirma que el manifest está accesible
curl -sI https://euskera.crintech.pro/manifest.json | head -1

# Confirma que el SW está accesible
curl -sI https://euskera.crintech.pro/sw.js | head -1

# Opcional: Lighthouse audit (Chrome DevTools → Lighthouse → PWA)
```

Si alguno falla, no continúes — Bubblewrap se basa en estos ficheros.

### 2.2. Generar el proyecto TWA con Bubblewrap

Desde la raíz del repo:

```bash
npx @bubblewrap/cli init --manifest=https://euskera.crintech.pro/manifest.json
```

Te preguntará varias cosas. Respuestas recomendadas:

| Pregunta | Respuesta |
|---|---|
| Domain | `euskera.crintech.pro` |
| Application name | `Kaixo — Aprende euskera` |
| Short name | `Kaixo` |
| Application ID | `com.crintechstudios.kaixo` |
| Display mode | `standalone` |
| Status bar color | `#FFFFFF` |
| Splash screen color | `#FFFFFF` |
| Icon URL | `https://euskera.crintech.pro/favicon-512.png` |
| Maskable icon URL | `https://euskera.crintech.pro/favicon-512-maskable.png` |
| Include Play Billing | No |
| Signing key | Generar nuevo o usar `crintechstudios.jks` (alias `upload`) |

El proyecto se genera en `./twa/` o en el cwd según versión. Recomendado mover a un directorio aparte fuera del repo `euskera-static` para no contaminar el repo público:

```bash
mkdir -p ../kaixo-android && mv twa-manifest.json app-release-* ./../kaixo-android/
# (o ejecutar bubblewrap init desde ../kaixo-android/ directamente)
```

### 2.3. Construir el AAB firmado

```bash
cd ../kaixo-android
npx @bubblewrap/cli build
```

El output es `app-release-bundle.aab` firmado con la upload key. Este es el fichero que se sube a Play Console.

### 2.4. Crear la app en Play Console

1. Play Console → Crear app → nombre `Kaixo` → categoría `Educación` → gratuita
2. Configurar firma: **Use Google-generated key** (recomendado). Esto activa Play App Signing.
3. Pruebas internas → crear release → subir `app-release-bundle.aab`
4. Esperar a que termine el upload — Google validará la firma y el bundle

### 2.5. Obtener el SHA-256 fingerprint y completar assetlinks.json

Una vez subido el primer AAB:

1. Play Console → **Configuración → Integridad de la app → App signing**
2. Copiar el campo **"Huella digital del certificado SHA-256"** (formato `AB:CD:EF:...`)
3. Editar `public/.well-known/assetlinks.json` en este repo:
   - Sustituir `REEMPLAZAR_TRAS_PRIMER_UPLOAD_A_PLAY_CONSOLE` por el fingerprint copiado tal cual (incluyendo los `:`)
4. Commitear y dejar que Cloudflare Pages despliegue
5. Verificar accesible:

```bash
curl -s https://euskera.crintech.pro/.well-known/assetlinks.json | jq .
```

Hasta que `assetlinks.json` tenga el fingerprint correcto, el TWA arrancará con barra de URL visible (modo "Custom Tab") — es el comportamiento defensivo de Android. En cuanto el JSON es válido y accesible, Android lo valida en background y promociona la app a TWA real sin URL bar.

### 2.6. Activar el release

Una vez verificado el assetlinks (puedes testear con [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator)):

1. Internal testing → Subir tester emails → Probar TWA en dispositivo real (la URL bar debe desaparecer tras unos segundos de uso)
2. Si todo OK → Promote release → Closed testing → Production

## 3. Ficha Play Store (textos)

### Título corto (30 chars)
```
Kaixo — Aprende euskera
```

### Descripción corta (80 chars)
```
Aprende euskera gratis. Sin login, sin tracking, sin paywall. CEFR A1 a EGA.
```

### Descripción larga
```
Kaixo es una app gratuita para aprender euskera desde cero hasta nivel
EGA, siguiendo el currículum oficial CEFR europeo.

Sin login. Sin cuentas. Sin anuncios. Sin tracking. Sin paywall.

CARACTERÍSTICAS

· Niveles A1 a EGA con lecciones cortas y enfocadas
· 4 tipos de ejercicio: opción múltiple, rellena el hueco, flashcards,
  emparejar
· Sistema de progreso y logros (Bronze, Silver, Gold, Platinum, Special)
· Modo Expedición: aventura narrativa pixelart en castellano y euskera
· Funciona offline tras la primera visita
· Tus datos viven en tu dispositivo — exporta tu progreso con un hash
  que pegas en otro dispositivo para sincronizar
· Open source (MIT + CC BY-SA 4.0) — currículum en Markdown público

POR QUÉ ES GRATIS
Kaixo es un proyecto de la familia Crintech Studios pensado para que
nadie pague por aprender la lengua que ya es suya. El contenido sigue
el estándar CEFR europeo (dominio público) y las explicaciones son
originales.

DERECHOS Y PRIVACIDAD
· Sin recolección de datos personales
· Progreso guardado solo en tu dispositivo
· Contenido bajo CC BY-SA 4.0 — puedes reutilizarlo citando el autor
```

### Categoría
Education

### Tags
euskera, basque, language learning, idiomas, CEFR, EGA

### Política de privacidad
Crear página `/privacidad/` en el sitio o reutilizar la global de crintech.pro.

### Capturas requeridas
- Mínimo 2, máximo 8 capturas phone (1080×1920 recomendado)
- Opcional: tablet 7" y 10"
- Generar con `adb exec-out screencap -p > shot.png` en un dispositivo Android con la TWA instalada (testing internal)

## 4. Ciclo de release posterior

Cuando hagas cambios en la PWA (contenido nuevo, fixes):
- La PWA se actualiza sola en Android — los usuarios reciben el cambio en su próxima visita (network-first sobre HTML por el SW)
- **No necesitas re-subir AAB** para cambios de contenido o UI
- Solo re-subes AAB si cambias el shell del TWA: `versionCode/versionName`, `applicationId`, iconos del launcher, target SDK, o assetlinks

Para cambios del shell:
```bash
cd ../kaixo-android
npx @bubblewrap/cli update  # bump versionCode automático
npx @bubblewrap/cli build
# Subir nuevo AAB a Play Console
```

## 5. Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| TWA arranca con barra de URL | `assetlinks.json` ausente, mal formado, o fingerprint incorrecto | Verificar fingerprint en Play Console y volver a desplegar `assetlinks.json` |
| "App not installed" en sideload | Bundle no firmado | Confirmar que `bubblewrap build` completó sin errores y firmó con la upload key |
| Play rechaza el bundle | targetSdk demasiado bajo | `bubblewrap update` regenera con target actual |
| Splash screen en blanco infinito | SW no registrado o falla en la home | Verificar `navigator.serviceWorker.register('/sw.js')` en RootLayout.astro |
