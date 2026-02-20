# Publicacion Web Gratis - Plan Inicial

Objetivo: publicar Bidones sin costo.

## Opcion A: Render Free + SQLite

- Ventaja: no hay cambios de codigo.
- Desventaja: almacenamiento efimero.
- Resultado: los datos se pueden perder al reiniciar.
- Uso recomendado: demo temporal.

## Opcion B: Render Free + Postgres Free

- Ventaja: datos persistentes en base externa.
- Desventaja: hay que migrar SQLite a Postgres.
- Uso recomendado: produccion liviana gratis.

## Opcion C: Vercel/Netlify + Backend externo gratis

- Ventaja: frontend facil de publicar.
- Desventaja: este proyecto es fullstack Node + Prisma y requiere separar arquitectura.

## Recomendacion

Elegir Opcion B: Render Free + Postgres Free.

## Proximos pasos tecnicos en esta rama

1. Cambiar Prisma datasource a Postgres.
2. Adaptar tipos/migraciones para Postgres.
3. Agregar script de bootstrap para entorno cloud.
4. Documentar deploy gratis paso a paso.
5. Probar deploy con URL publica.
