// Servidor estático mínimo para servir la página de prueba local.
// Sin dependencias externas: usa el módulo http nativo.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "test-page");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function createServer() {
  return http.createServer((req, res) => {
    // Solo servimos archivos dentro de ROOT (evita path traversal)
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const safePath = path
      .normalize(urlPath)
      .replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(ROOT, safePath);
    if (safePath === "/" || safePath === "") {
      filePath = path.join(ROOT, "index.html");
    }
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

// Arranca el servidor en un puerto libre y devuelve { server, url }
function startServer(port = 0) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

module.exports = { startServer };
