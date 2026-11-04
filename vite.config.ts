import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

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

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function leadsApi(): Plugin {
  return {
    name: "leads-api",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      if (env.SUPABASE_URL) process.env.SUPABASE_URL ??= env.SUPABASE_URL;
      if (env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY ??= env.SUPABASE_SERVICE_ROLE_KEY;

      server.middlewares.use("/api/leads", (req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on("end", async () => {
          try {
            const headers = new Headers();
            const contentType = headerValue(req.headers["content-type"]);
            const origin = headerValue(req.headers.origin);
            if (contentType) headers.set("content-type", contentType);
            if (origin) headers.set("origin", origin);
            const host = headerValue(req.headers.host) ?? "127.0.0.1";
            const request = new Request(`http://${host}/api/leads`, {
              method: req.method,
              headers,
              body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
            });
            const module = await server.ssrLoadModule("/api/leads.ts");
            const handle = module.default?.fetch ?? module.POST ?? module.default;
            const response = await handle(request);
            res.statusCode = response.status;
            res.setHeader("content-type", response.headers.get("content-type") ?? "application/json; charset=utf-8");
            res.setHeader("cache-control", response.headers.get("cache-control") ?? "no-store");
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.setHeader("cache-control", "no-store");
            res.end(JSON.stringify({ ok: false, message: "No pudimos guardar la solicitud. Inténtalo de nuevo en unos minutos." }));
          }
        });
      });
    },
  };
}

const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  appType: "mpa",
  plugins: [htmlPartials(), leadsApi()],
  build: {
    rollupOptions: {
      input: {
        inicio: resolve("index.html"),
        servicios: resolve("servicios/index.html"),
        oportunidades: resolve("oportunidades/index.html"),
        acomprarya: resolve("oportunidades/acomprarya/index.html"),
        docto: resolve("oportunidades/docto/index.html"),
        metodo: resolve("como-trabajamos/index.html"),
        nosotros: resolve("nosotros/index.html"),
        clientes: resolve("clientes/index.html"),
        contacto: resolve("contacto/index.html"),
        privacidad: resolve("privacidad/index.html"),
      },
    },
  },
});
