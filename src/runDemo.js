// runDemo.js — Prueba mínima de Playwright contra una página LOCAL.
//
// Objetivo (solo esto por ahora):
//   Playwright → Chromium → página local → carga correcta → screenshot → cerrar
//
// NO incluye (a propósito): Multilogin API, automation_type, connectOverCDP,
// tokens, inicio de perfil, ni acción de comentar. Eso vendrá después.
//
// Requisito: la página debe estar servida en http://localhost:8080
//   (ver instrucciones: python3 -m http.server 8080 desde test-page/).
const { chromium } = require("playwright");
const path = require("path");

const URL = "http://localhost:8080";
const SCREENSHOT_PATH = path.join(__dirname, "..", "screenshots", "test-page.png");

async function main() {
  console.log("=== Demo Playwright (página local) ===");

  let browser;
  try {
    console.log("1) Lanzando Chromium (headless: false)...");
    browser = await chromium.launch({ headless: false });

    console.log("2) Creando browser context...");
    const context = await browser.newContext();

    console.log("3) Creando página...");
    const page = await context.newPage();

    console.log(`4) Navegando a ${URL} ...`);
    await page.goto(URL, { waitUntil: "load" });

    console.log("5) Esperando a que cargue el contenido...");
    await page.waitForSelector("h1");
    const titulo = await page.textContent("h1");
    console.log(`   Título detectado: "${titulo}"`);

    console.log(`6) Tomando screenshot en ${SCREENSHOT_PATH} ...`);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log("   Screenshot guardado.");

    console.log("7) Cerrando el navegador...");
    await browser.close();

    console.log("\n✅ DEMO OK: página cargada y screenshot tomado.");
  } catch (err) {
    console.error("\n❌ ERROR en la demo:", err.message);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
