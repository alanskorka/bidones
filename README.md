# Bidones

App web para asignar quien lleva bidones por grupo.

## Requisitos

- Node.js 20+
- npm
- Base PostgreSQL (recomendado: Supabase Free)

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

## Deploy gratis (Supabase + Vercel)

### 1) Crear base gratis en Supabase

1. Crear cuenta en Supabase.
2. Crear proyecto (plan Free).
3. Copiar `Connection string` de Postgres desde `Connect`.
4. Usar preferentemente pooler para conexiones desde servicios web.

### 2) Deploy en Vercel

1. Subir este repo a GitHub.
2. En Vercel: `Add New...` -> `Project`.
3. Importar repo y elegir la rama `web-free-deploy`.
4. En `Environment Variables` agregar:
   - `DATABASE_URL=<pooler_url:6543 con pgbouncer=true>`
5. Deploy.

### 3) Verificacion

Abrir:
- `https://TU-PROYECTO.vercel.app/asignacion`

## Scripts

- `npm run app`: servidor web en desarrollo
- `npm run build`: compilar TypeScript
- `npm run start`: ejecutar compilado
- `npm run test`: tests
- `npm run prisma:deploy`: sincroniza esquema (`prisma db push`)
