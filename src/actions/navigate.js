// Acción: navegar a una URL y esperar a que la página esté lista.
async function navigate(page, url) {
  console.log(`🧭 Navegando a ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="comment-input"]');
  console.log("   ✅ Página cargada");
}

module.exports = { navigate };
