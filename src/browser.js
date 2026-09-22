// Abstracción del arranque del navegador para Playwright.
//
// HOY (camino B): lanzamos un Chromium normal con playwright.chromium.launch().
//   Esto permite validar TODO el flujo (navegar, escribir, enviar, verificar)
//   sin depender del start por API de Multilogin (bloqueado por LOCK_PROFILE_ERROR).
//
// FUTURO (cuando Multilogin resuelva el 501): en lugar de launch(), haremos
//   connectOverCDP(`http://127.0.0.1:${port}`) con el puerto que devuelve el
//   start por API con automation_type=playwright. El resto del flujo (actions,
//   runDemo) NO cambia, porque todos reciben un `page` de Playwright.
//
// Selecciona el modo con la variable de entorno BROWSER_MODE:
//   - "local" (por defecto): Chromium local.
//   - "cdp": conecta por CDP a CDP_ENDPOINT (p. ej. http://127.0.0.1:XXXXX).
const { chromium } = require("playwright");

// Lanza/conecta un navegador y devuelve { browser, context, close }.
// `options` normalmente proviene de un perfil (profiles.js -> profile.browser):
//   { mode: "local"|"cdp", headless: bool, cdpEndpoint: string }
async function launchBrowser(options = {}) {
  const mode = process.env.BROWSER_MODE || options.mode || "local";
  // Precedencia de headless: env HEADLESS (si está definida) > opción del perfil > true.
  const headless =
    process.env.HEADLESS !== undefined
      ? process.env.HEADLESS !== "false"
      : options.headless ?? true;

  if (mode === "cdp") {
    const endpoint = options.cdpEndpoint || process.env.CDP_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "Modo CDP sin endpoint: falta options.cdpEndpoint o CDP_ENDPOINT"
      );
    }
    console.log(`🔌 Conectando por CDP a ${endpoint} ...`);
    const browser = await chromium.connectOverCDP(endpoint);
    // Con connectOverCDP el contexto ya existe (el del navegador arrancado por
    // el arnés de prueba HOY, o por Multilogin en el FUTURO). Reutilizamos ese
    // contexto para que la sesión/perfil sea la real.
    const context = browser.contexts()[0] || (await browser.newContext());
    return {
      browser,
      context,
      close: async () => {
        // En modo CDP NO cerramos el navegador subyacente: eso lo gestiona quien
        // lo arrancó (el arnés en el dry-run, Multilogin en producción).
        // Solo soltamos la conexión de Playwright.
        await browser.close().catch(() => {});
      },
    };
  }

  // Modo local (por defecto)
  console.log(`🖥️  Lanzando Chromium local (headless=${headless}) ...`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  return {
    browser,
    context,
    close: async () => {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

module.exports = { launchBrowser };
