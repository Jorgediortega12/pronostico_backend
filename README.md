# Pronostico Backend

Backend API para el sistema de pronósticos.

## Requisitos

- Node.js
- npm

## Instalación

```bash
npm install
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
PORT=3000
NODE_ENV=development
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── api/          # Rutas y endpoints
├── config/       # Configuraciones
├── controllers/  # Controladores
├── helpers/      # Utilidades
├── loaders/      # Inicializadores
├── models/       # Modelos de datos
├── services/     # Lógica de servicios
└── templates/    # Plantillas
```

## Licencia

ISC
