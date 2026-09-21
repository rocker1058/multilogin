# Multilogin Demo — Automatización con Playwright

Demo técnico para automatizar un perfil de navegador de **Multilogin X** (Mimic) usando
**Node.js + Playwright**, controlado desde CLI.

> **Alcance / uso responsable**
> Este proyecto es un **demo técnico** pensado para **páginas propias, entornos de QA
> y cuentas de prueba autorizadas**. No está destinado a generar comentarios masivos,
> spam, ni interacción engañosa con múltiples cuentas en plataformas de terceros.
> El uso automatizado de redes sociales debe respetar los Términos de Servicio de cada
> plataforma.

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
| Código Node.js                          | ✅ OK |
| Conexión WSL → agente Windows           | ✅ OK (autodetección de IP) |
| Token de automatización                 | ✅ Válido (larga duración) |
| Perfiles (Cloud storage)                | ✅ OK |
| **Start del perfil por API**            | ❌ **Bloqueado** (ver más abajo) |

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

- Node.js 18+
- App de escritorio de **Multilogin X** instalada y **abierta** (el agente escucha en el
  puerto `45001`).
- Un **token de automatización** de Multilogin (larga duración).
- Si usas **WSL**: el agente corre en Windows; el script detecta automáticamente la IP
  del host (gateway) para alcanzarlo.

---

## Configuración (`.env`)

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

> **No subas el `.env` a git.** Añádelo a `.gitignore`.

---

## Uso

```bash
# Instalar dependencias
npm install

# Iniciar perfil por API (bloqueado hasta que soporte resuelva el 501)
node src/multilogin.js
```

---

## Estructura del proyecto (objetivo)

```
multilogin-demo/
├── .env                 # credenciales (NO subir a git)
├── .gitignore
├── package.json
├── README.md
├── src/
│   ├── multilogin.js    # start (API) → puerto CDP → stop
│   ├── attach.js        # (referencia) leer estado/puerto de un perfil
│   ├── mlx.js           # helpers de la API de Multilogin (login/start/stop)
│   ├── runDemo.js       # orquesta: start → playwright → acción → stop
│   └── actions/
│       ├── navigate.js
│       ├── comment.js   # en página de PRUEBA / entorno autorizado
│       ├── reply.js
│       └── like.js
└── docs/
    └── soporte-multilogin.md
```

---

## Endpoints usados (Multilogin X)

| Acción                  | Método | Endpoint |
| ----------------------- | ------ | -------- |
| Iniciar sesión          | POST   | `https://api.multilogin.com/user/signin` |
| Start perfil            | GET    | `https://launcher.mlx.yt:45001/api/v2/profile/f/{folder}/p/{profile}/start?automation_type=playwright` |
| Estado de perfiles      | GET    | `<launcher>/api/v1/profile/statuses` |
| Stop todos              | GET    | `<launcher>/api/v1/profile/stop_all` |
| Versión del agente      | GET    | `<launcher>/api/v1/version` |

> El `start` con `automation_type` devuelve un `port`. Playwright se conecta con
> `connectOverCDP("http://127.0.0.1:{port}")`.

Notas:
- Los tokens de usuario duran ~30 min. Los **automation tokens** duran mucho más.
- En WSL, `launcher.mlx.yt` resuelve a `127.0.0.1`, que **no** es donde está el agente;
  hay que usar la IP del host Windows (autodetectada por el script).

---

## Próximos pasos

1. **Desbloqueo (externo):** que Multilogin resuelva el `501` del servicio de lock.
   Ver `docs/soporte-multilogin.md` para el reporte.
2. **Mientras tanto (avanzable):**
   - Montar `runDemo.js` + `actions/` y validar el flujo de Playwright contra una
     **página de prueba propia/local** (sin depender del start por API).
3. **Cuando el 501 se resuelva:** conectar `runDemo.js` al `start` real por API,
   obtener el puerto CDP y ejecutar las acciones de extremo a extremo.

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
