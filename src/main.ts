import { parseLead } from "./lead";

const page = document.body.dataset.page ?? "";

document.querySelectorAll<HTMLAnchorElement>("#main-nav a[data-nav]").forEach((link) => {
  if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
});

const menuToggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
const nav = document.querySelector<HTMLElement>("#main-nav");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    nav.classList.toggle("open", !isOpen);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
    });
  });
}

const form = document.querySelector<HTMLFormElement>("#lead-form");
if (form) initLeadForm(form);

function initLeadForm(leadForm: HTMLFormElement): void {
  const panels = Array.from(leadForm.querySelectorAll<HTMLElement>("[data-step-panel]"));
  const nextButton = requiredButton("#next-button");
  const backButton = requiredButton("#back-button");
  const submitButton = requiredButton("#submit-button");
  const progressFill = requiredElement<HTMLElement>("#progress-fill");
  const progress = requiredElement<HTMLElement>("[role='progressbar']");
  const stepLabel = requiredElement<HTMLElement>("#step-label");
  const stepName = requiredElement<HTMLElement>("#step-name");
  const servicesError = requiredElement<HTMLElement>("#services-error");
  const servicesGroup = requiredElement<HTMLElement>("#services-group");
  const formStatus = requiredElement<HTMLElement>("#form-status");
  const labels = ["Tu consulta", "Tu oportunidad", "Siguiente etapa"];
  let currentStep = 0;

  function showStep(index: number, moveFocus = false): void {
    currentStep = index;
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });
    progressFill.style.width = `${((index + 1) / panels.length) * 100}%`;
    progress.setAttribute("aria-valuenow", String(index + 1));
    stepLabel.textContent = `Paso ${index + 1} de ${panels.length}`;
    stepName.textContent = labels[index] ?? "";
    backButton.hidden = index === 0;
    nextButton.hidden = index === panels.length - 1;
    submitButton.hidden = index !== panels.length - 1;
    if (moveFocus) panels[index]?.querySelector<HTMLElement>(".step-title")?.focus();
  }

  function validateStep(index: number): boolean {
    const panel = panels[index];
    if (!panel) return false;
    const fields = Array.from(panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const field of fields) {
      if (field.classList.contains("hp-input")) continue;
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    if (index === 1) {
      const hasService = panel.querySelector<HTMLInputElement>('input[name="services"]:checked');
      if (!hasService) {
        servicesError.classList.add("visible");
        servicesGroup.setAttribute("aria-invalid", "true");
        panel.querySelector<HTMLInputElement>('input[name="services"]')?.focus();
        return false;
      }
      servicesError.classList.remove("visible");
      servicesGroup.removeAttribute("aria-invalid");
    }
    return true;
  }

  nextButton.addEventListener("click", () => {
    if (validateStep(currentStep) && currentStep < panels.length - 1) showStep(currentStep + 1, true);
  });

  backButton.addEventListener("click", () => {
    showStep(Math.max(0, currentStep - 1), true);
  });

  servicesGroup.addEventListener("change", () => {
    if (servicesGroup.querySelector('input[name="services"]:checked')) {
      servicesError.classList.remove("visible");
      servicesGroup.removeAttribute("aria-invalid");
    }
  });

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    for (let index = 0; index < panels.length; index += 1) {
      if (!validateStep(index)) {
        showStep(index, true);
        return;
      }
    }

    const payload = leadPayload(leadForm);
    if (String(payload.companyWebsite ?? "").trim() !== "") return;

    const parsed = parseLead(payload);
    if (!parsed.ok) {
      showStatus(parsed.message, true);
      return;
    }

    submitButton.disabled = true;
    backButton.disabled = true;
    showStatus("Enviando la solicitud…", false);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || body?.ok !== true) {
        showStatus(body?.message ?? "No pudimos guardar la solicitud. Lo que escribiste sigue en el formulario.", true);
        return;
      }
      showStatus("Recibimos tu solicitud. Te escribiremos al correo que indicaste.", false);
    } catch {
      showStatus("No pudimos enviar la solicitud. Revisa tu conexión. Lo que escribiste sigue en el formulario.", true);
    } finally {
      submitButton.disabled = false;
      backButton.disabled = false;
    }
  });

  function showStatus(message: string, isError: boolean): void {
    formStatus.hidden = false;
    formStatus.textContent = message;
    formStatus.classList.toggle("is-error", isError);
    formStatus.focus();
  }

  showStep(0);
}

function leadPayload(leadForm: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(leadForm);
  return {
    fullName: String(data.get("fullName") ?? ""),
    email: String(data.get("email") ?? ""),
    phone: String(data.get("phone") ?? ""),
    location: String(data.get("location") ?? ""),
    businessName: String(data.get("businessName") ?? ""),
    businessStage: String(data.get("businessStage") ?? ""),
    industry: String(data.get("industry") ?? ""),
    services: data.getAll("services").map(String),
    challenge: String(data.get("challenge") ?? ""),
    startupCapital: String(data.get("startupCapital") ?? ""),
    projectBudget: String(data.get("projectBudget") ?? ""),
    timeline: String(data.get("timeline") ?? ""),
    consent: data.get("consent") === "on",
    companyWebsite: String(data.get("companyWebsite") ?? ""),
  };
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró ${selector}`);
  return element;
}

function requiredButton(selector: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(selector);
}
