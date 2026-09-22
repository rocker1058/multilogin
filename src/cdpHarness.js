// cdpHarness.js — Arnés de PRUEBA para el dry-run del modo CDP.
//
// ¿Qué hace? Lanza un Chromium local con el puerto de depuración remota
// (--remote-debugging-port) habilitado y devuelve su endpoint CDP:
//   http://127.0.0.1:<puerto>
//
// ¿Por qué? Para reproducir EXACTAMENTE lo que Multilogin hará por nosotros:
// cuando el Start por API funcione (hoy bloqueado por LOCK_PROFILE_ERROR / 501),
// Multilogin arranca el navegador del perfil y nos devuelve un puerto CDP.
// Aquí simulamos ese paso levantando el Chromium nosotros mismos.
//
// Cada navegador usa su propio --user-data-dir temporal, de modo que los dos
// perfiles quedan TOTALMENTE aislados (cookies, sesión, almacenamiento).
//
// FUTURO: este archivo desaparece del flujo real. En su lugar, el puerto vendrá
// del Start API de Multilogin. `browser.js` (mode:"cdp") no cambia.

const { chromium } = require("playwright");
const http = require("http");

// Espera a que el endpoint CDP responda en /json/version.
function waitForCdp(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/json/version", timeout: 1000 },
        (res) => {
          res.resume();
          if (res.statusCode === 200) return resolve();
          retry();
        }
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        return reject(new Error(`CDP no respondió en el puerto ${port}`));
      }
      setTimeout(tryOnce, 250);
    };
    tryOnce();
  });
}

// Lanza un Chromium con CDP en `port` y devuelve { cdpEndpoint, close }.
// Nota: Playwright ya asigna un user-data-dir temporal aislado por instancia,
// así que NO pasamos --user-data-dir (Playwright lo prohíbe como arg). Cada
// llamada => navegador independiente => perfiles aislados entre sí.
async function launchCdpChromium(port, { headless = true } = {}) {
  // launchServer levanta un Chromium real con el puerto de depuración indicado.
  const server = await chromium.launchServer({
    headless,
    args: [`--remote-debugging-port=${port}`],
  });

  await waitForCdp(port);
  const cdpEndpoint = `http://127.0.0.1:${port}`;
  console.log(`   🧪 Chromium CDP de prueba listo en ${cdpEndpoint}`);

  return {
    cdpEndpoint,
    close: async () => {
      await server.close().catch(() => {});
    },
  };
}

module.exports = { launchCdpChromium };
