// mlx.js — Integración REAL con la API de Multilogin X.
//
// ⚠️ PREPARADO PERO NO ACTIVO: hoy NO se ejecuta contra Multilogin porque el
// backend sigue devolviendo LOCK_PROFILE_ERROR / HTTP 501 al crear el lock del
// perfil (servicio bpds). Ver README y docs/soporte-multilogin.md.
//
// Cuando soporte resuelva el 501, este helper es el ÚNICO punto a activar:
// sustituye a src/cdpHarness.js (el arnés de prueba) sin tocar el resto.
//
//   ANTES (dry-run):   const { cdpEndpoint } = await launchCdpChromium(port)
//   DESPUÉS (real):    const { port, cdpEndpoint } = await mlxStartProfile(profile)
//
// El flujo posterior NO cambia:
//   const { port } = await mlxStartProfile(profile);
//   const cdpEndpoint = `http://127.0.0.1:${port}`;
//   chromium.connectOverCDP(cdpEndpoint);
//
// Nunca se hardcodean tokens: todo sale de .env.

require("dotenv").config();

const axios = require("axios");
const https = require("https");
const { execSync } = require("child_process");
const fs = require("fs");

// --- Configuración desde .env (nunca hardcodear el token) ---
const {
  WORKSPACE_ID,
  FOLDER_ID,
  PROFILE_ID,
  MULTILOGIN_TOKEN,
} = process.env;

// Detecta el host donde escucha el agente de Multilogin.
// En WSL el agente corre en Windows (alcanzable por la IP del gateway), no en
// 127.0.0.1 (que apunta al propio WSL). Fuera de WSL usa localhost.
function resolveLauncherBase() {
  if (process.env.MLX_LAUNCHER) return process.env.MLX_LAUNCHER;

  const isWSL =
    fs.existsSync("/proc/version") &&
    /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));

  let host = "127.0.0.1";
  if (isWSL) {
    try {
      const out = execSync("ip route | grep -m1 default", { encoding: "utf8" });
      const match = out.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (match) host = match[1];
    } catch {
      // Si falla la detección, dejamos 127.0.0.1
    }
  }
  return `https://${host}:45001`;
}

// Agente TLS que ignora el certificado self-signed del launcher local.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// Cabeceras de autenticación (token desde .env).
function authHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${MULTILOGIN_TOKEN}`,
  };
}

// Resuelve los IDs efectivos: prioriza los del `profile` y cae a los de .env.
function resolveIds(profile = {}) {
  return {
    workspaceId: profile.workspaceId || WORKSPACE_ID,
    folderId: profile.folderId || FOLDER_ID,
    profileId: profile.multiloginProfileId || profile.profileId || PROFILE_ID,
  };
}

// Verifica que exista la configuración mínima antes de llamar a la API.
function assertConfig(ids) {
  const missing = [];
  if (!MULTILOGIN_TOKEN) missing.push("MULTILOGIN_TOKEN");
  if (!ids.folderId) missing.push("FOLDER_ID");
  if (!ids.profileId) missing.push("PROFILE_ID");
  if (missing.length) {
    throw new Error(
      `Falta configuración en .env para Multilogin: ${missing.join(", ")}`
    );
  }
}

/**
 * mlxStartProfile — Inicia un perfil por API y devuelve su puerto CDP.
 *
 * Endpoint oficial:
 *   GET /api/v2/profile/f/{folder_id}/p/{profile_id}/start
 *       ?automation_type=playwright&headless_mode=false
 *
 * El puerto llega en response.data.data.port (doc oficial de Multilogin).
 *
 * @param {object} profile  (opcional) perfil con IDs propios; si no, usa .env.
 * @returns {Promise<{ port:number, cdpEndpoint:string, raw:object }>}
 *
 * NOTA: preparado, pero HOY fallará con 501 (bloqueo del backend bpds).
 */
async function mlxStartProfile(profile = {}) {
  const ids = resolveIds(profile);
  assertConfig(ids);

  const launcherBase = resolveLauncherBase();
  const url =
    `${launcherBase}/api/v2/profile/f/${ids.folderId}/p/${ids.profileId}/start` +
    `?automation_type=playwright&headless_mode=false`;

  console.log(`🚀 [MLX] Start perfil ${ids.profileId} → ${launcherBase}`);
  const res = await axios.get(url, {
    headers: authHeaders(),
    httpsAgent: insecureAgent,
  });

  // El puerto CDP viene anidado en data.data.port.
  const port = res.data?.data?.port;
  if (!port) {
    throw new Error(
      `Respuesta de start sin 'port'. Cuerpo: ${JSON.stringify(res.data)}`
    );
  }

  const cdpEndpoint = `http://127.0.0.1:${port}`;
  console.log(`✅ [MLX] Perfil iniciado. Puerto CDP: ${port}`);
  return { port, cdpEndpoint, raw: res.data };
}

/**
 * mlxStopProfile — PREPARA la llamada de stop (libera el lock del perfil).
 *
 * ⚠️ NO se ejecuta automáticamente todavía. Está lista para invocarse cuando
 * activemos el flujo real, típicamente en el `finally` del runner.
 *
 * Endpoint:
 *   GET /api/v1/profile/stop?profile_id={profile_id}
 *
 * @param {object} profile
 * @returns {Promise<object>}
 */
async function mlxStopProfile(profile = {}) {
  const ids = resolveIds(profile);
  assertConfig(ids);

  const launcherBase = resolveLauncherBase();
  const url = `${launcherBase}/api/v1/profile/stop?profile_id=${ids.profileId}`;

  console.log(`🛑 [MLX] Stop perfil ${ids.profileId}`);
  const res = await axios.get(url, {
    headers: authHeaders(),
    httpsAgent: insecureAgent,
  });
  return res.data;
}

module.exports = { mlxStartProfile, mlxStopProfile, resolveLauncherBase };
