# Bidones

Version local estable de la app para asignar quien lleva bidones por grupo.

## Requisitos

- Node.js 20+
- npm

## Levantar en localhost (paso a paso)

1. Ir a la carpeta del proyecto:
   - `cd c:\Alan\bidones`
2. Copiar variables de entorno:
   - Windows: `copy .env.example .env`
3. Instalar dependencias:
   - `npm.cmd install`
4. Generar cliente Prisma:
   - `npm.cmd run prisma:generate`
5. Crear/actualizar estructura de base de datos:
   - `npm.cmd run dev -- init`
6. Levantar app:
   - `npm.cmd run app`
7. Abrir en navegador:
   - `http://localhost:3030/asignacion`

## Pantallas

- `/asignacion`: pegar lista y elegir
- `/grupos`: crear, seleccionar y borrar grupos
- `/plantel`: agregar alias/jugadores, activar/desactivar y borrar jugador
- `/historial`: ver y borrar registros

## Base de datos local

- Motor: SQLite
- Archivo: `c:\Alan\bidones\prisma\dev.db`

## Ver la base de datos

### Opcion recomendada: Prisma Studio

1. En otra terminal:
   - `cd c:\Alan\bidones`
   - `npm.cmd run db:studio`
2. Se abre una UI web con las tablas:
   - `teams`
   - `players`
   - `aliases`
   - `carry_log`

### Opcion alternativa: DB Browser for SQLite

- Abrir el archivo `prisma/dev.db` con DB Browser for SQLite.

## Notas

- La primera linea no vacia de la lista se ignora siempre.
- Si el puerto 3030 esta ocupado, `iniciar_bidones.bat` cierra el proceso previo y vuelve a arrancar.

