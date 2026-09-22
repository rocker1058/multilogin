// Acción: dar "me gusta" a un comentario.
// Recibe el locator del comentario y devuelve el nuevo conteo de likes.
async function like(commentLocator) {
  console.log("👍 Dando me gusta...");
  const likeBtn = commentLocator.locator('[data-testid="like-btn"]');
  const likeCount = commentLocator.locator('[data-testid="like-count"]');

  const before = parseInt((await likeCount.textContent()) || "0", 10);
  await likeBtn.click();
  // Espera a que el conteo aumente
  await likeCount.filter({ hasText: String(before + 1) }).waitFor().catch(() => {});
  const after = parseInt((await likeCount.textContent()) || "0", 10);
  console.log(`   ✅ Likes: ${before} → ${after}`);
  return after;
}

module.exports = { like };
