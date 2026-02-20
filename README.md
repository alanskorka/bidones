# Bidones

App web para asignar quien lleva bidones por grupo/equipo.

## Requisitos

- Node.js 20+
- npm

## Instalacion local

1. Copiar variables de entorno:
   - Windows: `copy .env.example .env`
   - macOS/Linux: `cp .env.example .env`
2. Instalar dependencias:
   - `npm install`
3. Generar Prisma Client:
   - `npm run prisma:generate`
4. Aplicar migraciones:
   - `npm run dev -- init`
5. Levantar la app:
   - `npm run app`
6. Abrir:
   - `http://localhost:3030/asignacion`

## Pantallas

- `/asignacion`: pegar lista y obtener el elegido
- `/grupos`: crear, seleccionar y borrar grupos
- `/plantel`: agregar alias/jugadores, activar/desactivar y borrar jugador
- `/historial`: ver historial y borrar registros

## Regla de parseo de lista

- La primera linea no vacia siempre se ignora.
- Se ignoran lineas vacias y encabezados tipicos.
- Se normaliza texto (lowercase, sin tildes, espacios colapsados, numeraciones iniciales comunes).

## Publicar en internet (deploy)

El repo ya queda preparado para deploy con Docker.

### Opcion recomendada: Render (Web Service con Docker)

1. Subir este repo a GitHub.
2. En Render: New + Web Service + conectar repo.
3. Runtime: Docker.
4. Variables:
   - `PORT=3030`
   - `DATABASE_URL=file:./dev.db`
5. Montar un disco persistente en `/app/prisma` para que SQLite no se pierda.
6. Deploy.

La app quedara publica con URL HTTPS de Render.

## Scripts

- `npm run app`: ejecutar servidor web en desarrollo
- `npm run build`: compilar TypeScript
- `npm run start`: ejecutar servidor compilado
- `npm run test`: tests

## Nota sobre borrado

- No se puede borrar el ultimo grupo.
- No se puede borrar un jugador si tiene historial; primero hay que borrar sus registros de historial.