// runner.js — Orquesta una acción para DOS perfiles independientes.
//
// Dos modos de ejecución (RUN_MODE):
//   - "local" (por defecto): cada perfil lanza su propio Chromium con launch().
//   - "cdp" (DRY-RUN): un arnés de prueba (cdpHarness.js) levanta un Chromium
//     con puerto de depuración por perfil y el runner se conecta con
//     connectOverCDP(). Reproduce EXACTAMENTE lo que hará Multilogin.
//
// En AMBOS modos el resto del flujo es idéntico:
//   page → comment() → reply()
// y las acciones NO cambian, porque solo dependen de objetos de Playwright.
//
// FUTURO (Multilogin): sustituir el arnés (cdpHarness.js) por el Start API real,
// que devuelve el puerto CDP. El runner y las acciones NO cambian.

const { startServer } = require("./server");
const { launchBrowser } = require("./browser");
const { getProfiles } = require("./profiles");
const { comment } = require("./actions/comment");
const { reply } = require("./actions/reply");
const { launchCdpChromium } = require("./cdpHarness");

// Puertos CDP de prueba (uno por perfil) para el dry-run. Aislados entre sí.
const CDP_TEST_PORTS = [9222, 9333];

// Ejecuta la acción de un perfil de principio a fin.
// `browserOptions` es la config de navegador ya resuelta (local o cdp).
async function runProfile(profile, browserOptions, targetUrl) {
  console.log(`\n▶️  [${profile.id}] ${profile.label}`);

  let handle;
  try {
    // 1) Navegador propio de este perfil (aislado del otro).
    handle = await launchBrowser(browserOptions);
    const page = await handle.context.newPage();

    // 2) Ir a la página de prueba local.
    console.log(`   🌐 [${profile.id}] Navegando a ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "load" });

    // 3) Ejecutar la acción: comentar + verificar, luego responder + verificar.
    const createdComment = await comment(page, profile.comment);
    await reply(createdComment, profile.reply);

    console.log(`   ✅ [${profile.id}] Acción completada`);
    return { id: profile.id, ok: true };
  } catch (err) {
    console.error(`   ❌ [${profile.id}] Error: ${err.message}`);
    return { id: profile.id, ok: false, error: err.message };
  } finally {
    if (handle) await handle.close();
  }
}

async function main() {
  const runMode = process.env.RUN_MODE || "local";
  console.log(`=== Runner multi-perfil (RUN_MODE=${runMode}) ===`);

  // Servidor local con la página de prueba.
  const { server, url } = await startServer();
  console.log(`🗂️  Página de prueba servida en ${url}`);

  const profiles = getProfiles();
  const headless =
    process.env.HEADLESS !== undefined ? process.env.HEADLESS !== "false" : true;

  // Arnés CDP (solo en dry-run): levanta un Chromium con puerto por perfil.
  const harnesses = [];
  // browserOptions resuelto por perfil (lo que recibirá launchBrowser).
  const browserOptionsByProfile = [];

  if (runMode === "cdp") {
    console.log("\n🧪 DRY-RUN CDP: levantando un Chromium por perfil...");
    for (let i = 0; i < profiles.length; i++) {
      const port = CDP_TEST_PORTS[i];
      const harness = await launchCdpChromium(port, { headless });
      harnesses.push(harness);
      // Inyectamos el endpoint del arnés como si viniera de Multilogin.
      browserOptionsByProfile.push({
        mode: "cdp",
        cdpEndpoint: harness.cdpEndpoint,
      });
    }
  } else {
    // Modo local: usamos la config de navegador del propio perfil.
    for (const profile of profiles) {
      browserOptionsByProfile.push(profile.browser);
    }
  }

  // Ejecuta los perfiles en paralelo (cada uno con su propio navegador).
  const results = await Promise.all(
    profiles.map((profile, i) =>
      runProfile(profile, browserOptionsByProfile[i], url)
    )
  );

  // Cerrar los navegadores del arnés (en dry-run) y el servidor local.
  for (const h of harnesses) await h.close();
  await new Promise((resolve) => server.close(resolve));

  // Resumen.
  console.log("\n=== Resumen ===");
  for (const r of results) {
    console.log(`   ${r.ok ? "✅" : "❌"} ${r.id}${r.ok ? "" : ` — ${r.error}`}`);
  }

  const allOk = results.every((r) => r.ok);
  console.log(allOk ? "\n✅ Todos los perfiles OK" : "\n⚠️  Algún perfil falló");
  process.exit(allOk ? 0 : 1);
}

main();
