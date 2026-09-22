// Acción: escribir un comentario y enviarlo, luego verificar que apareció.
//
// Función reutilizable: recibe un `page` de Playwright (da igual si viene de
// chromium.launch() o de connectOverCDP()) y el texto del comentario.
//
// Selectores basados en data-testid (ver test-page/index.html):
//   [data-testid="comment-input"]   -> textarea
//   [data-testid="comment-submit"]  -> botón "Comentar"
//   [data-testid="comment"]         -> <li> de cada comentario
//   [data-testid="comment-text"]    -> texto del comentario
//
// Devuelve el locator del comentario recién creado, para poder encadenar
// acciones (p. ej. reply) sobre él.
async function comment(page, text) {
  console.log(`   💬 Escribiendo comentario: "${text}"`);

  // 1) Encontrar el campo de comentario y escribir.
  const input = page.locator('[data-testid="comment-input"]');
  await input.waitFor({ state: "visible" });
  await input.fill(text);

  // 2) Pulsar el botón de comentar.
  await page.locator('[data-testid="comment-submit"]').click();

  // 3) Verificar que el comentario apareció (con el texto exacto).
  const created = page
    .locator('[data-testid="comment"]', {
      has: page.locator('[data-testid="comment-text"]', { hasText: text }),
    })
    .last();
  await created.waitFor({ state: "visible" });

  console.log("   ✅ Comentario verificado en la página");
  return created;
}

module.exports = { comment };
