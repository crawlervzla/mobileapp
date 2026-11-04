# Mobileapp Business Development

Sitio de Mobileapp Business Development SpA. Presenta las oportunidades del portafolio digital y los proyectos tecnológicos realizados para clientes.

## Páginas

- `/` Inicio
- `/oportunidades/` Oportunidades del portafolio
- `/oportunidades/acomprarya/` Ficha de AComprarYa
- `/oportunidades/docto/` Ficha de Docto
- `/servicios/` Acompañamiento tecnológico
- `/como-trabajamos/` Cómo trabajamos
- `/nosotros/` Nosotros
- `/clientes/` Proyectos para clientes
- `/contacto/` Consultas sobre oportunidades y tecnología
- `/privacidad/` Política de privacidad

Cada página es un documento HTML propio, para que pueda indexarse como el inicio.

## Estado de proyectos

- **AComprarYa:** software en producción y en etapa de validación comercial con dos vendedores. Tiene un operador logístico conectado por API. Mobileapp informa que aún no hay ventas.
- **Docto:** plataforma web en producción en Chile y Venezuela; su aplicación móvil espera aprobación de publicación en Play Store. Mobileapp informa que aún no hay campañas de captación ni pagos dentro de la plataforma.
- **Calculadólar:** proyecto propio de Mobileapp en desarrollo y no disponible actualmente para adquisición o inversión.
- **AS Electronic y Valma Seguridad:** proyectos tecnológicos realizados para clientes; no forman parte del portafolio de inversión.

Los estados comerciales anteriores corresponden a la información entregada por Mobileapp al 4 de noviembre de 2026. El software en producción no implica ventas, ingresos o retorno de inversión demostrados.

## Desarrollo

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

`npm run typecheck` revisa TypeScript. `npm run build` genera `dist/`.

## Publicación

Vercel publica el entorno Production desde la rama `main`. El dominio `mobileapp.cl` redirige a `www.mobileapp.cl`, que apunta a Production. Un push a `main` inicia el despliegue de Vercel.

GitHub Actions valida los cambios con `npm ci`, `npm test` y `npm run build`; ya no publica otra copia en GitHub Pages. El build de Vercel utiliza la raíz del sitio y genera `dist/`. La revisión local también comprobó el build con `VITE_BASE=/mobileapp/` para verificar compatibilidad de las rutas y assets si se necesitara esa base en otro entorno.

## Esta entrega

El formulario comercial está temporalmente desactivado en el sitio. La API de `POST /api/leads` exige `MOBILEAPP_LEADS_ENABLED=true` antes de leer o procesar una solicitud; sin esa variable responde 503 y no escribe en Supabase. La versión publicada incluye un aviso provisional de privacidad.

Para habilitar el formulario en una publicación posterior:

1. Completa y aprueba el aviso de privacidad, incluido el plazo y el procedimiento real para eliminar contactos que no se conviertan en clientes.
2. Las migraciones `20261103160000_create_leads.sql` y `20261104120000_lead_consent_version.sql` ya están aplicadas en el proyecto compartido `acomprarya` (región `us-east-1`). Crean `public.mob_leads` y `public.mob_insert_mobileapp_lead`, aisladas de los objetos existentes mediante el prefijo `mob_`; no las ejecutes de nuevo.
3. Mantén `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como variables protegidas en Vercel. Para desarrollo local usa `.env.local`, excluido de Git. Nunca uses el prefijo `VITE_` en la clave de servicio.
4. Solo después de aprobar el aviso y el proceso de retención, define `MOBILEAPP_LEADS_ENABLED=true` en el entorno Production de Vercel y crea un nuevo despliegue. No habilites esta variable en Preview si apunta a la base real.
5. Prueba el guardado con datos sintéticos y confirma el comportamiento antes de anunciar el formulario como operativo.

Proyectos y sitios relacionados (los enlaces llevan a los sitios de cada organización):

La clasificación es distinta del origen de los logotipos: AComprarYa y Docto son oportunidades propias; Calculadólar es un proyecto propio en desarrollo; AS Electronic y Valma Seguridad son trabajos para clientes.

- [AComprarYa](https://acomprarya.com)
- [Docto](https://doctohc.com)
- [Calculadólar](https://calculadolar.org)
- [AS Electronic](https://www.aselectronic.cl)
- [Valma Seguridad](https://valmaseguridad.cl)
