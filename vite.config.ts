import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function htmlPartials(): Plugin {
  const header = readFileSync(resolve("src/partials/header.html"), "utf8");
  const footer = readFileSync(resolve("src/partials/footer.html"), "utf8");

  return {
    name: "html-partials",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace("<!-- partial:header -->", header)
          .replace("<!-- partial:footer -->", footer);
      },
    },
  };
}

export default defineConfig({
  appType: "mpa",
  plugins: [htmlPartials()],
  build: {
    rollupOptions: {
      input: {
        inicio: resolve("index.html"),
        servicios: resolve("servicios/index.html"),
        metodo: resolve("como-trabajamos/index.html"),
        nosotros: resolve("nosotros/index.html"),
        clientes: resolve("clientes/index.html"),
        contacto: resolve("contacto/index.html"),
        privacidad: resolve("privacidad/index.html"),
      },
    },
  },
});
