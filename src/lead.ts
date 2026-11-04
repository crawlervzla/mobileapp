import { z } from "zod";

const industries = [
  "Comercio y e-commerce",
  "Servicios profesionales",
  "Alimentos y gastronomía",
  "Salud y bienestar",
  "Educación y capacitación",
  "Logística y operaciones",
  "Startup o emprendimiento digital",
  "AComprarYa · comercio digital",
  "Docto · salud digital",
  "Otro",
] as const;

const services = [
  "Estrategia y modelo digital",
  "Sitio o aplicación web",
  "Aplicación móvil",
  "Automatización e integración",
  "Inteligencia artificial",
  "Necesito orientación",
  "Adquisición total del modelo",
  "Adquisición con pago en cuotas",
  "Asociación de inversión por modelo",
  "Validación comercial previa",
  "Acompañamiento tecnológico",
  "Desarrollo tecnológico para mi empresa",
] as const;

const timelines = [
  "Lo antes posible",
  "Durante el próximo mes",
  "En 1 a 3 meses",
  "En más de 3 meses",
  "Solo estoy explorando opciones",
] as const;

const optionalText = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => (value ? value : null));

const optionalAmount = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value ? value : null));

/** Texto vigente del aviso de mobileapp.cl. No rellenar filas antiguas con esta versión. */
export const consentVersion = "mobileapp-privacidad-2026-11-04";

export const leadInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value) => (value ? value : null)),
  location: z.string().trim().min(2).max(120),
  businessName: optionalText,
  businessStage: z.enum(["idea", "validacion", "operativo"]),
  industry: z.enum(industries),
  services: z.array(z.enum(services)).min(1).max(services.length),
  challenge: z.string().trim().min(20).max(4000),
  startupCapital: optionalAmount,
  projectBudget: optionalAmount,
  timeline: z.enum(timelines),
  consent: z.literal(true),
  companyWebsite: z.string().optional().default(""),
});

export type LeadInput = z.input<typeof leadInputSchema>;
export type LeadRecord = z.output<typeof leadInputSchema>;

export function parseLead(input: unknown): { ok: true; lead: LeadRecord } | { ok: false; message: string } {
  const parsed = leadInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los datos del formulario. Falta un campo o alguno no tiene el formato esperado." };
  }
  return { ok: true, lead: parsed.data };
}
