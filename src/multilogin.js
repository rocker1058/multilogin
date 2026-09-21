require("dotenv").config();

const axios = require("axios");
const https = require("https");
const { execSync } = require("child_process");
const fs = require("fs");

const {
  MULTILOGIN_TOKEN,
  FOLDER_ID,
  PROFILE_ID,
} = process.env;

// Detecta el host donde escucha el agente de Multilogin.
// En WSL el agente corre en Windows, alcanzable por la IP del gateway,
// no por 127.0.0.1 (que apunta al propio WSL). Fuera de WSL usa localhost.
function resolveLauncherBase() {
  if (process.env.MLX_LAUNCHER) return process.env.MLX_LAUNCHER;

  const isWSL =
    fs.existsSync("/proc/version") &&
    /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));

  let host = "127.0.0.1";
  if (isWSL) {
    try {
      // La IP por defecto (gateway) es la del host Windows visto desde WSL
      const out = execSync("ip route | grep -m1 default", { encoding: "utf8" });
      const match = out.match(/default via (\d+\.\d+\.\d+\.\d+)/);
      if (match) host = match[1];
    } catch {
      // Si falla la detección, dejamos 127.0.0.1
    }
  }
  return `https://${host}:45001`;
}

const MLX_LAUNCHER = resolveLauncherBase();

// Agente que ignora certificados self-signed del launcher local
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const authHeaders = {
  Accept: "application/json",
  Authorization: `Bearer ${MULTILOGIN_TOKEN}`,
};

// Lanza el perfil
async function startProfile() {
  const url =
    `${MLX_LAUNCHER}/api/v2/profile/f/${FOLDER_ID}/p/${PROFILE_ID}/start` +
    `?automation_type=playwright&headless_mode=false`;

  console.log(`🚀 Lanzando perfil ${PROFILE_ID}...`);
  const res = await axios.get(url, {
    headers: authHeaders,
    httpsAgent: insecureAgent,
  });
  console.log("✅ Perfil lanzado");
  console.log(res.data);
  return res.data;
}

// Detiene el perfil (libera el lock)
async function stopProfile() {
  const url = `${MLX_LAUNCHER}/api/v1/profile/stop?profile_id=${PROFILE_ID}`;
  try {
    const res = await axios.get(url, {
      headers: authHeaders,
      httpsAgent: insecureAgent,
    });
    console.log("🛑 Perfil detenido");
    console.log(res.data);
  } catch (err) {
    console.warn(
      "⚠️ No se pudo detener el perfil:",
      err.response?.data || err.message
    );
  }
}

async function main() {
  console.log("🔎 Probando conexión con Multilogin...");
  console.log(`Launcher:   ${MLX_LAUNCHER}`);
  console.log(`Profile ID: ${PROFILE_ID}`);
  console.log(`Folder ID: ${FOLDER_ID}`);

  try {
    await startProfile();

    // Aquí iría tu automatización con Playwright usando el puerto devuelto.
    // Al terminar, detenemos el perfil para no dejarlo bloqueado:
    await stopProfile();
  } catch (error) {
    console.error("❌ ERROR");
    if (error.response) {
      console.error("HTTP:", error.response.status);
      console.error("Respuesta:", error.response.data);
    } else {
      console.error(error.message);
    }
    // Si el arranque falló pero el perfil quedó bloqueado, intentamos liberarlo
    await stopProfile();
  }
}

main();
