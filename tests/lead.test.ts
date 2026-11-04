import assert from "node:assert/strict";
import test from "node:test";
import { handleLeadRequest, type LeadWriter } from "../api/leads.ts";
import { consentVersion, parseLead } from "../src/lead.ts";

const valid = {
  fullName: "Camila Rojas",
  email: "Camila@Empresa.com",
  phone: "",
  location: "Colombia, Medellín",
  businessName: "",
  businessStage: "idea",
  industry: "Comercio y e-commerce",
  services: ["Sitio o aplicación web"],
  challenge: "Quiero ordenar los pedidos que hoy llevo en una planilla.",
  startupCapital: "Aún no lo sé",
  projectBudget: "5000 USD",
  timeline: "Durante el próximo mes",
  consent: true,
  companyWebsite: "",
};

test("acepta una solicitud completa y normaliza el correo", () => {
  const result = parseLead(valid);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lead.email, "camila@empresa.com");
    assert.equal(result.lead.phone, null);
    assert.equal(result.lead.businessName, null);
  }
});

test("acepta una consulta inicial sin capital ni presupuesto", () => {
  const result = parseLead({ ...valid, startupCapital: "", projectBudget: "" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.lead.startupCapital, null);
    assert.equal(result.lead.projectBudget, null);
  }
});

test("acepta una consulta de asociación para un modelo del portafolio", () => {
  const result = parseLead({ ...valid, industry: "Docto · salud digital", services: ["Asociación de inversión por modelo"] });
  assert.equal(result.ok, true);
});

test("rechaza una solicitud sin consentimiento", () => {
  const result = parseLead({ ...valid, consent: false });
  assert.equal(result.ok, false);
});

test("rechaza un desafío demasiado corto", () => {
  const result = parseLead({ ...valid, challenge: "Muy corto" });
  assert.equal(result.ok, false);
});

test("rechaza un método distinto de POST", async () => {
  const response = await handleLeadRequest(jsonRequest(valid, { method: "GET" }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rechaza un cuerpo que no es JSON", async () => {
  const response = await handleLeadRequest(jsonRequest("hola", { contentType: "text/plain" }), saved);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).ok, false);
});

test("rechaza un cuerpo más grande que el máximo", async () => {
  const response = await handleLeadRequest(jsonRequest({ ...valid, challenge: "a".repeat(20_000) }), saved);
  assert.equal(response.status, 413);
});

test("rechaza un origen distinto del sitio", async () => {
  const response = await handleLeadRequest(jsonRequest(valid, { origin: "https://ejemplo-ajeno.test" }), saved);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).message, "No pudimos aceptar la solicitud.");
});

test("acepta el origen de producción aunque la función responda en otro host", async () => {
  let received = "";
  const response = await handleLeadRequest(
    jsonRequest(valid, { origin: "https://www.mobileapp.cl", url: "https://mobileapp-preview.vercel.app/api/leads" }),
    async (lead) => {
      received = lead.email;
      return "saved";
    },
  );
  assert.equal(response.status, 201);
  assert.equal(received, "camila@empresa.com");
});

test("un campo oculto con contenido no se guarda", async () => {
  let called = false;
  const response = await handleLeadRequest(jsonRequest({ ...valid, companyWebsite: "https://spam.example" }), async () => {
    called = true;
    return "saved";
  });
  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.deepEqual(await response.json(), { ok: true });
});

test("sin almacenamiento configurado no confirma el guardado", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousEnabled = process.env.MOBILEAPP_LEADS_ENABLED;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.MOBILEAPP_LEADS_ENABLED;
  try {
    const response = await handleLeadRequest(jsonRequest(valid));
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.message, /no se guardó/);
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousEnabled === undefined) delete process.env.MOBILEAPP_LEADS_ENABLED;
    else process.env.MOBILEAPP_LEADS_ENABLED = previousEnabled;
  }
});

test("las credenciales Supabase no activan la captura si falta el interruptor explícito", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousEnabled = process.env.MOBILEAPP_LEADS_ENABLED;
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-placeholder";
  delete process.env.MOBILEAPP_LEADS_ENABLED;
  try {
    const response = await handleLeadRequest(jsonRequest(valid));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      message: "El formulario está temporalmente desactivado. La solicitud no se guardó.",
    });
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    if (previousEnabled === undefined) delete process.env.MOBILEAPP_LEADS_ENABLED;
    else process.env.MOBILEAPP_LEADS_ENABLED = previousEnabled;
  }
});

test("una inserción exitosa guarda la versión vigente del aviso", async () => {
  let version = "";
  const response = await handleLeadRequest(jsonRequest(valid), async (lead, meta) => {
    version = meta.consentVersion;
    assert.equal(lead.email, "camila@empresa.com");
    return "saved";
  });
  assert.equal(response.status, 201);
  assert.equal(version, consentVersion);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("un fallo del proveedor responde sin detalles internos", async () => {
  const response = await handleLeadRequest(jsonRequest(valid), async () => {
    throw new Error("supabase connection string super-secret-value");
  });
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(JSON.stringify(body).includes("super-secret-value"), false);
});

test("el límite informado por el almacenamiento compartido responde 429", async () => {
  const response = await handleLeadRequest(jsonRequest(valid), async () => "limited");
  assert.equal(response.status, 429);
});

test("solicitudes simultáneas del mismo correo no superan el tope compartido", async () => {
  let count = 0;
  let chain = Promise.resolve();
  const writer: LeadWriter = (lead) => {
    const run = chain.then(async () => {
      assert.equal(lead.email, "camila@empresa.com");
      if (count >= 3) return "limited" as const;
      count += 1;
      return "saved" as const;
    });
    chain = run.then(() => undefined, () => undefined);
    return run;
  };

  const responses = await Promise.all(Array.from({ length: 5 }, () => handleLeadRequest(jsonRequest(valid), writer)));
  const statuses = responses.map((response) => response.status).sort();
  assert.deepEqual(statuses, [201, 201, 201, 429, 429]);
  assert.equal(count, 3);
});

const saved: LeadWriter = async () => "saved";

function jsonRequest(body: unknown, init: { method?: string; origin?: string; url?: string; contentType?: string } = {}): Request {
  const method = init.method ?? "POST";
  const headers = new Headers();
  if (init.contentType !== "") headers.set("content-type", init.contentType ?? "application/json");
  if (init.origin !== "") headers.set("origin", init.origin ?? "http://127.0.0.1");
  const payload = method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body);
  return new Request(init.url ?? "http://127.0.0.1/api/leads", { method, headers, body: payload });
}
