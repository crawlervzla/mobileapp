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
  const labels = ["Tu negocio", "Tu desafío", "Tu proyecto"];
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

  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    for (let index = 0; index < panels.length; index += 1) {
      if (!validateStep(index)) {
        showStep(index, true);
        return;
      }
    }

    const honeypot = leadForm.querySelector<HTMLInputElement>(".hp-input");
    if (honeypot && honeypot.value.trim() !== "") return;

    formStatus.hidden = false;
    formStatus.textContent = "Revisamos los datos en esta página, pero esta entrega todavía no envía ni guarda la solicitud. Lo que escribiste sigue en el formulario.";
    formStatus.focus();
  });

  showStep(0);
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró ${selector}`);
  return element;
}

function requiredButton(selector: string): HTMLButtonElement {
  return requiredElement<HTMLButtonElement>(selector);
}
