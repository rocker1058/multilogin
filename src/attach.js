require("dotenv").config();

const axios = require("axios");
const https = require("https");
const { execSync } = require("child_process");
const fs = require("fs");

const { MULTILOGIN_TOKEN, PROFILE_ID } = process.env;

// Detecta el host del agente (WSL -> IP de Windows; si no, localhost)
function resolveLauncherBase() {
  if (process.env.MLX_LAUNCHER) return process.env.MLX_LAUNCHER;
  const isWSL =
    fs.existsSync("/proc/version") &&
    /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));
  let host = "127.0.0.1";
  if (isWSL) {
    try {
      const out = execSync("ip route | grep -m1 default", { encoding: "utf8" });
      const m = out.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (m) host = m[1];
    } catch {}
  }
  return `https://${host}:45001`;
}

const MLX_LAUNCHER = resolveLauncherBase();
const insecureAgent = new https.Agent({ rejectUnauthorized: false });
const authHeaders = {
  Accept: "application/json",
  Authorization: `Bearer ${MULTILOGIN_TOKEN}`,
};

// Obtiene el puerto de automatización de un perfil YA abierto desde la app.
async function getPortOfRunningProfile() {
  const url = `${MLX_LAUNCHER}/api/v1/profile/statuses`;
  const res = await axios.get(url, { headers: authHeaders, httpsAgent: insecureAgent });
  const states = res.data?.data?.states || {};
  const state = states[PROFILE_ID];

  if (!state) {
    throw new Error(
      `El perfil ${PROFILE_ID} no aparece. ¿Lo abriste desde la app?`
    );
  }
  console.log(`Estado del perfil: ${state.status} (${state.name})`);

  const port = state.port || state.automation_port;
  if (!port) {
    throw new Error(
      `El perfil está en estado "${state.status}" pero no expone puerto todavía. ` +
        `Asegúrate de abrirlo con automatización activada y espera unos segundos.`
    );
  }
  return { port, name: state.name };
}

async function main() {
  console.log("🔎 Buscando perfil abierto...");
  console.log(`Launcher:   ${MLX_LAUNCHER}`);
  console.log(`Profile ID: ${PROFILE_ID}`);

  try {
    const { port, name } = await getPortOfRunningProfile();
    console.log(`✅ Perfil "${name}" corriendo en el puerto ${port}`);
    console.log(`   Endpoint CDP para Playwright: http://127.0.0.1:${port}`);
    console.log("");
    console.log("👉 Siguiente paso: conectar Playwright a ese puerto (CDP).");
    // Aquí conectaríamos Playwright con connectOverCDP para automatizar.
  } catch (error) {
    console.error("❌", error.response?.data || error.message);
  }
}

main();
