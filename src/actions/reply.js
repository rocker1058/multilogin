// Acción: responder a un comentario existente.
//
// PREPARADA para uso futuro. La página local de prueba ya incluye el flujo de
// respuesta (botón "Responder" + input + submit) para poder validarla, pero el
// runner NO la ejecuta todavía por defecto.
//
// Recibe el locator del comentario (el que devuelve comment()) y el texto.
// Selectores (dentro de cada comentario):
//   [data-testid="reply-btn"]     -> botón "Responder"
//   [data-testid="reply-input"]   -> textarea de respuesta
//   [data-testid="reply-submit"]  -> botón enviar respuesta
//   [data-testid="reply"]         -> cada respuesta creada
async function reply(commentLocator, text) {
  console.log(`   ↩️  Respondiendo: "${text}"`);

  // 1) Abrir el formulario de respuesta del comentario.
  await commentLocator.locator('[data-testid="reply-btn"]').click();

  // 2) Escribir la respuesta.
  const replyInput = commentLocator.locator('[data-testid="reply-input"]');
  await replyInput.waitFor({ state: "visible" });
  await replyInput.fill(text);

  // 3) Enviar.
  await commentLocator.locator('[data-testid="reply-submit"]').click();

  // 4) Verificar que la respuesta apareció.
  const created = commentLocator
    .locator('[data-testid="reply"]', { hasText: text })
    .last();
  await created.waitFor({ state: "visible" });

  console.log("   ✅ Respuesta verificada");
  return created;
}

module.exports = { reply };
