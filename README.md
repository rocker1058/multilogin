# Multilogin Demo — Automatización con Playwright

Demo técnico para automatizar perfiles de navegador de **Multilogin X** (Mimic) usando
**Node.js + Playwright**, controlado desde CLI.

El motor soporta **dos perfiles independientes** (`PROFILE_1`, `PROFILE_2`), cada uno con
su propio navegador/contexto aislado, ejecutando acciones reutilizables
(`comment()`, `reply()`) sobre un objeto `page` de Playwright.

> **Alcance / uso responsable**
> Este proyecto es un **demo técnico** pensado para **páginas propias, entornos de QA
> y cuentas de prueba autorizadas**. No está destinado a generar comentarios masivos,
> spam, ni interacción engañosa con múltiples cuentas en plataformas de terceros.
> El uso automatizado de redes sociales debe respetar los Términos de Servicio de cada
> plataforma.

---

## Cómo replicar en otro PC (paso a paso)

Sigue estos pasos en una máquina nueva. Los pasos 1–4 **no requieren Multilogin** y te
permiten probar el motor completo (local + CDP dry-run).

### 1. Requisitos previos

- **Node.js 18+** y npm. Verifica:
  ```bash
  node -v
  npm -v
  ```
- **git** para clonar el repositorio.
- (Solo para el flujo Multilogin real, hoy bloqueado) la app de escritorio de
  **Multilogin X** abierta y un **token de automatización**.

### 2. Clonar e instalar dependencias

```bash
git clone git@github.com:rocker1058/multilogin.git multilogin-demo
cd multilogin-demo

# Instala axios, dotenv y playwright (usa el package-lock.json)
npm install

# Descarga el navegador Chromium que usa Playwright (IMPRESCINDIBLE)
npx playwright install chromium
```

> En Linux, si `npx playwright install chromium` se queja de librerías del sistema,
> ejecuta también: `npx playwright install-deps chromium` (requiere sudo).

### 3. Crear el archivo `.env`

El `.env` **no** se sube a git (está en `.gitignore`). Créalo a partir de la plantilla:

```bash
cp .env.example .env
```

Para los pasos LOCAL y CDP dry-run **no necesitas** valores reales; el `.env` de la
plantilla sirve. Solo hará falta rellenarlo con datos reales cuando conectemos
Multilogin (ver sección correspondiente).

### 4. Probar el motor (sin Multilogin)

```bash
# Modo LOCAL: cada perfil lanza su propio Chromium local
HEADLESS=true node src/runner.js

# Modo CDP DRY-RUN: levanta un Chromium con puerto CDP por perfil
# y se conecta con connectOverCDP() (misma tecnología que usará Multilogin)
RUN_MODE=cdp HEADLESS=true node src/runner.js
```

Salida esperada en ambos casos:

```
=== Resumen ===
   ✅ PROFILE_1
   ✅ PROFILE_2

✅ Todos los perfiles OK
```

> `HEADLESS=true` es recomendable en servidores/entornos sin escritorio gráfico.
> Quítalo (o usa `HEADLESS=false`) si quieres ver las ventanas del navegador.

Con esto el proyecto queda replicado y verificado en el nuevo PC.

---

## Objetivo

```
Multilogin
   │
   ├── Perfil DEMO 01
   │       └── Mimic
   │             └── Playwright
   │
   └── Automatización
          ├── abrir una página
          ├── localizar un elemento
          ├── escribir / interactuar
          ├── enviar
          └── verificar resultado
```

Flujo objetivo (versión final, 100% automática):

```
Node.js
  ↓
Multilogin API  →  Start perfil  →  obtiene puerto CDP
  ↓
Playwright (connectOverCDP)
  ↓
acción (en página de prueba / entorno autorizado)
  ↓
Stop perfil
```

---

## Estado actual

| Componente                              | Estado |
| --------------------------------------- | ------ |
| Motor multi-perfil (Node.js)            | ✅ OK |
| Acciones `comment()` / `reply()`        | ✅ OK (probadas) |
| Modo LOCAL (Chromium)                   | ✅ OK (`node src/runner.js`) |
| Modo CDP DRY-RUN (connectOverCDP)       | ✅ OK (`RUN_MODE=cdp`) |
| Helper Multilogin (`src/mlx.js`)        | ✅ Preparado (no activo) |
| Conexión WSL → agente Windows           | ✅ OK (autodetección de IP) |
| Token de automatización                 | ✅ Válido (larga duración) |
| Perfiles (Cloud storage)                | ✅ OK |
| **Start del perfil por API**            | ❌ **Bloqueado** (ver más abajo) |

### Modos de ejecución del runner

El runner (`src/runner.js`) soporta dos modos mediante la variable `RUN_MODE`:

| Modo                | Comando                                       | Qué hace |
| ------------------- | --------------------------------------------- | -------- |
| `local` (default)   | `HEADLESS=true node src/runner.js`            | Cada perfil lanza su propio Chromium con `chromium.launch()`. |
| `cdp` (dry-run)     | `RUN_MODE=cdp HEADLESS=true node src/runner.js` | Un arnés (`cdpHarness.js`) levanta un Chromium con puerto CDP por perfil y el runner se conecta con `connectOverCDP()`. |

Variables de entorno útiles:

- `RUN_MODE=local|cdp` — selecciona el modo (default `local`).
- `HEADLESS=true|false` — fuerza headless (default `true`).

### Bloqueo actual: `LOCK_PROFILE_ERROR` / `can't lock profile`

El arranque por API falla **antes** de abrir el navegador. En los logs del agente
(`desktop_*.log`) el flujo es:

```
got metadata (core 152)      ✅
starting profile             ✅
lock profile → status 501    ❌  ← falla aquí
can't start locked profile: http client error
```

- El servicio de lock de Multilogin (**bpds**) responde **HTTP 501** al **crear** el lock.
- `RemoveProfileLock` (quitar lock) sí responde 200.
- Por la **UI de la app** los perfiles **sí** arrancan (usa otra sesión/ruta).
- Ocurre con **todos** los perfiles (Cloud storage) y persiste tras logout/login.

**Conclusión:** es un problema del **backend `bpds` de Multilogin**, no del código local.
Reportado a soporte (ver `docs/soporte-multilogin.md`).

### Nota sobre "conectar por CDP a un perfil abierto a mano"

No es viable con Multilogin: el navegador Mimic **no expone** el puerto de depuración
estándar (`--remote-debugging-port`) al abrirlo por UI. Usa un protocolo interno
(`--client-port`). El **puerto CDP para Playwright solo se obtiene arrancando por API**
con `automation_type`. Por eso el Start por API es imprescindible.

---

## Requisitos

- Node.js 18+ y npm.
- Navegador de Playwright instalado: `npx playwright install chromium`.
- Para el flujo Multilogin real (hoy bloqueado):
  - App de escritorio de **Multilogin X** instalada y **abierta** (el agente escucha en
    el puerto `45001`).
  - Un **token de automatización** de Multilogin (larga duración).
  - Si usas **WSL**: el agente corre en Windows; el script detecta automáticamente la IP
    del host (gateway) para alcanzarlo.

---

## Configuración (`.env`)

Copia la plantilla y rellena los valores (solo necesarios para el flujo Multilogin real):

```bash
cp .env.example .env
```

```env
WORKSPACE_ID=...
FOLDER_ID=...
PROFILE_ID=...
MULTILOGIN_TOKEN=<token-de-automatización>

# Opcional: forzar host del launcher. Si se omite:
#  - En WSL se detecta la IP de Windows automáticamente.
#  - Fuera de WSL usa 127.0.0.1.
# MLX_LAUNCHER=https://172.21.96.1:45001
```

> **No subas el `.env` a git.** Ya está incluido en `.gitignore`.

---

## Uso

```bash
# Instalar dependencias + navegador
npm install
npx playwright install chromium

# Motor multi-perfil, modo LOCAL (no requiere Multilogin)
HEADLESS=true node src/runner.js
# o con el script de package.json:
npm run runner

# Motor multi-perfil, modo CDP DRY-RUN (no requiere Multilogin)
RUN_MODE=cdp HEADLESS=true node src/runner.js

# (Bloqueado) Start del perfil por API de Multilogin, devuelve el 501 actual
node src/multilogin.js
```

---

## Estructura del proyecto

```
multilogin-demo/
├── .env                 # credenciales (NO subir a git)
├── .env.example         # plantilla de credenciales
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── src/
│   ├── runner.js        # ⭐ orquesta comment()+reply() para PROFILE_1 y PROFILE_2
│   ├── profiles.js      # define PROFILE_1 y PROFILE_2
│   ├── browser.js       # abstracción launch() (local) / connectOverCDP() (cdp)
│   ├── cdpHarness.js    # arnés de dry-run: levanta Chromium con puerto CDP por perfil
│   ├── mlx.js           # integración Multilogin Start/Stop API (preparada, no activa)
│   ├── server.js        # servidor estático local para la página de prueba
│   ├── multilogin.js    # (referencia) start API directo → puerto CDP → stop
│   ├── attach.js        # (referencia) leer estado/puerto de un perfil
│   ├── runDemo.js       # (referencia) demo mínima de Playwright contra página local
│   └── actions/
│       ├── comment.js   # escribe un comentario y verifica que apareció
│       ├── reply.js     # responde a un comentario y verifica
│       ├── navigate.js
│       └── like.js
├── test-page/
│   └── index.html       # página local de prueba (comentarios + respuestas)
└── docs/
    └── soporte-multilogin.md
```

---

## Endpoints usados (Multilogin X)

| Acción                  | Método | Endpoint |
| ----------------------- | ------ | -------- |
| Iniciar sesión          | POST   | `https://api.multilogin.com/user/signin` |
| Start perfil            | GET    | `https://launcher.mlx.yt:45001/api/v2/profile/f/{folder}/p/{profile}/start?automation_type=playwright&headless_mode=false` |
| Stop perfil             | GET    | `<launcher>/api/v1/profile/stop?profile_id={profile}` |
| Estado de perfiles      | GET    | `<launcher>/api/v1/profile/statuses` |
| Stop todos              | GET    | `<launcher>/api/v1/profile/stop_all` |
| Versión del agente      | GET    | `<launcher>/api/v1/version` |

> El `start` con `automation_type` devuelve un `port` en `data.data.port`. Playwright se
> conecta con `connectOverCDP("http://127.0.0.1:{port}")`.

Notas:
- Los tokens de usuario duran ~30 min. Los **automation tokens** duran mucho más.
- En WSL, `launcher.mlx.yt` resuelve a `127.0.0.1`, que **no** es donde está el agente;
  hay que usar la IP del host Windows (autodetectada por el script).

---

## Próximos pasos

1. **Desbloqueo (externo):** que Multilogin resuelva el `501` del servicio de lock.
   Ver `docs/soporte-multilogin.md` para el reporte.
2. **Cuando el 501 se resuelva:** en `runner.js` (bloque `RUN_MODE=cdp`), sustituir
   `launchCdpChromium(port)` por `mlxStartProfile(profile)` y añadir `mlxStopProfile(profile)`
   en el `finally`. Rellenar `multiloginProfileId` por perfil en `profiles.js`.
3. **Validación gradual:** probar primero **un solo perfil** (DEMO 01) de extremo a
   extremo; si funciona, activar el segundo; y solo después, en entorno autorizado,
   cambiar la URL de prueba por la real.

> El motor (`comment.js`, `reply.js`, lógica de dos perfiles) ya está probado contra CDP
> real, así que el desbloqueo no requiere reconstruir nada: solo cambiar el origen del
> puerto CDP.

---

## Diagnóstico técnico (resumen)

Se descartó, en orden, que el problema fuera:
- Código / parámetros de la petición.
- Conexión WSL → Windows (resuelto con autodetección de IP del gateway).
- Token (validado como `owner` por la API cloud).
- Sesión duplicada / perfil bloqueado (contadores de sesión en 0).
- Tipo de almacenamiento (los perfiles ya son Cloud).
- Archivo de perfil corrupto (`Default/AutofillStrikeDatabase`, renombrado a `.bak`).
- Logout/login en la app (no cambió el 501).

Causa raíz: **el servicio `bpds` de Multilogin devuelve `501` al crear el lock del
perfil por API**.
