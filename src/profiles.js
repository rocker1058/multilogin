// profiles.js — Definición de los perfiles de automatización.
//
// HOY: cada perfil describe cómo lanzar un Chromium LOCAL independiente
// (su propio browser + context aislado) y qué texto usará en la acción.
//
// FUTURO (Multilogin): cada perfil llevará además su multiloginProfileId y su
// cdpEndpoint (el puerto que devuelve el start por API). El runner solo tendrá
// que cambiar `mode: "local"` por `mode: "cdp"` y pasar `cdpEndpoint`.
// El resto del flujo (acciones) NO cambia, porque todo opera sobre un `page`.

const PROFILES = [
  {
    id: "PROFILE_1",
    label: "Perfil de prueba 1",
    // Config del navegador para este perfil (ver src/browser.js).
    browser: {
      mode: "local", // "local" ahora | "cdp" cuando Multilogin entregue el puerto
      headless: false,
      // cdpEndpoint: "http://127.0.0.1:XXXXX", // <- futuro (Multilogin)
      // multiloginProfileId: "...",            // <- futuro (Multilogin)
    },
    // Datos que usará la acción.
    comment: "Comentario de prueba desde PROFILE_1 👋",
    reply: "Respuesta de prueba desde PROFILE_1 ↩️",
  },
  {
    id: "PROFILE_2",
    label: "Perfil de prueba 2",
    browser: {
      mode: "local",
      headless: false,
      // cdpEndpoint: "http://127.0.0.1:YYYYY",
      // multiloginProfileId: "...",
    },
    comment: "Comentario de prueba desde PROFILE_2 🚀",
    reply: "Respuesta de prueba desde PROFILE_2 ↩️",
  },
];

// Helpers de acceso.
function getProfiles() {
  return PROFILES;
}

function getProfile(id) {
  return PROFILES.find((p) => p.id === id);
}

module.exports = { PROFILES, getProfiles, getProfile };
