# Bidones

App web para asignar quien lleva bidones por grupo.

## Requisitos

- Node.js 20+
- npm
- Base PostgreSQL (recomendado: Neon free)

## Instalacion local

1. Copiar variables:
   - Windows: `copy .env.example .env`
   - macOS/Linux: `cp .env.example .env`
2. Editar `.env` y definir `DATABASE_URL` de PostgreSQL.
3. Instalar dependencias:
   - `npm install`
4. Generar Prisma Client:
   - `npm run prisma:generate`
5. Inicializar esquema:
   - `npm run dev -- init`
6. Levantar app:
   - `npm run app`
7. Abrir:
   - `http://localhost:3030/asignacion`

## Pantallas

- `/asignacion`: pegar lista y obtener el elegido
- `/grupos`: crear, seleccionar y borrar grupos
- `/plantel`: agregar alias/jugadores, activar/desactivar y borrar jugador
- `/historial`: ver historial y borrar registros

## Regla de parseo

- La primera linea no vacia se ignora siempre.
- Se normaliza texto y numeraciones comunes.

## Deploy gratis (Neon + Render)

### 1) Crear base gratis en Neon

1. Crear cuenta en Neon.
2. Crear proyecto.
3. Copiar `Connection string` (pooled).
4. Verificar que tenga `sslmode=require`.

### 2) Crear web service gratis en Render

1. Subir este repo a GitHub.
2. En Render: `New` -> `Web Service`.
3. Conectar repo.
4. Configuracion:
   - Runtime: `Docker`
   - Branch: `main` (o la rama de deploy)
5. Variables de entorno:
   - `PORT=3030`
   - `DATABASE_URL=<tu_connection_string_de_neon>`
6. Deploy.

### 3) Verificacion

Abrir:
- `https://TU-SERVICIO.onrender.com/asignacion`

## Scripts

- `npm run app`: servidor web en desarrollo
- `npm run build`: compilar TypeScript
- `npm run start`: ejecutar compilado
- `npm run test`: tests
- `npm run prisma:deploy`: sincroniza esquema (`prisma db push`)

