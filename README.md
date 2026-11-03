# Mobileapp Business Development

Sitio de Mobileapp Business Development SpA. Esta primera entrega es el sitio público en páginas independientes, con el diseño del prototipo y los clientes que usan la tecnología.

## Páginas

- `/` Inicio
- `/servicios/` Servicios
- `/como-trabajamos/` Cómo trabajamos
- `/nosotros/` Nosotros
- `/clientes/` Clientes
- `/contacto/` Solicitud de presupuesto
- `/privacidad/` Nota provisional, pendiente de validación legal

Cada página es un documento HTML propio, para que pueda indexarse como el inicio.

## Desarrollo

Requiere Node.js 22 o superior.

```bash
npm install
npm run dev
```

`npm run typecheck` revisa TypeScript. `npm run build` genera `dist/`.

## Publicación

Cada push a `main` construye el sitio y lo publica en GitHub Pages: https://crawlervzla.github.io/mobileapp/

## Esta entrega

El formulario de tres pasos valida en el navegador y conserva lo escrito. Todavía no envía ni guarda la solicitud: falta la API, PostgreSQL y la política de privacidad definitiva.

Los logos de clientes se tomaron de sus sitios públicos:

- [AComprarYa](https://acomprarya.com)
- [Docto](https://doctohc.com)
- [Calculadólar](https://calculadolar.org)
- [AS Electronic](https://www.aselectronic.cl)
- [Valma Seguridad](https://valmaseguridad.cl)
