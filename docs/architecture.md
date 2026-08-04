# Arquitectura Bidones

## Diagrama de clases

```mermaid
classDiagram
direction LR

class Team {
  +id: Int
  +name: String
  +active: Boolean
}

class Player {
  +id: Int
  +teamId: Int
  +canonicalName: String
  +active: Boolean
}

class Alias {
  +id: Int
  +teamId: Int
  +playerId: Int
  +aliasNormalized: String
}

class CarryLog {
  +id: Int
  +teamId: Int
  +date: String
  +playerId: Int
  +rawListText: String
  +createdAt: DateTime
}

class Normalize {
  +normalizeText(input): string
}

class ParseList {
  +parseList(rawText): ParsedName[]
}

class ResolvePlayers {
  +resolvePlayers(parsedNames, client): {resolved, unresolved}
}

class PickCarrier {
  +pickCarrier(attendees, client): PickResult
}

class RenderMessage {
  +renderMessage(canonicalName): string
}

class AppAPI {
  +POST /api/pick
  +GET /api/groups
  +POST /api/groups
  +GET /api/players
  +POST /api/players
  +POST /api/aliases
  +GET /api/history
  +DELETE /api/history
}

Team "1" --> "*" Player : contiene
Team "1" --> "*" Alias : contiene
Team "1" --> "*" CarryLog : contiene
Player "1" --> "*" Alias : tiene
Player "1" --> "*" CarryLog : registra

AppAPI ..> ParseList : usa
ParseList ..> Normalize : usa
ResolvePlayers ..> Alias : consulta
ResolvePlayers ..> Player : resuelve
AppAPI ..> PickCarrier : usa
AppAPI ..> RenderMessage : usa
```

## Diagrama de secuencia: asignacion (`POST /api/pick`)

```mermaid
sequenceDiagram
autonumber
actor U as Usuario
participant FE as Frontend (/asignacion.js)
participant API as Express API (/api/pick)
participant PARSE as parseList
participant DB as Prisma + PostgreSQL
participant PICK as pickCarrier
participant MSG as renderMessage

U->>FE: Pega lista + fecha + grupo
FE->>API: POST /api/pick {groupId, date, listText}
API->>PARSE: parseList(listText)
PARSE-->>API: nombres normalizados
API->>DB: buscar aliases del grupo para esos nombres
DB-->>API: aliases + players activos

alt hay nombres sin mapear
  API-->>FE: 400 {ok:false, unresolvedNames}
  FE-->>U: Muestra error y no registra
else todos resueltos
  API->>DB: groupBy carry_log por playerId
  DB-->>API: timesCarried + lastCarriedAt
  API->>PICK: pickCarrier(attendees, stats)
  PICK-->>API: jugador elegido
  API->>DB: insert carry_log(date, playerId, rawListText, teamId)
  API->>MSG: renderMessage(canonicalName)
  MSG-->>API: "Hoy lleva bidones: X. Gracias 🙌"
  API-->>FE: 200 {ok:true, selectedName, message}
  FE-->>U: Muestra elegido + boton copiar
end
```

## Diagrama de secuencia: gestion de plantel

```mermaid
sequenceDiagram
autonumber
actor U as Usuario
participant FE as Frontend (/plantel.js)
participant API as Express API
participant NORM as normalizeText
participant DB as Prisma + PostgreSQL

U->>FE: Agregar jugador canónico
FE->>API: POST /api/players {groupId, canonicalName}
API->>DB: create player(active=true)
API->>NORM: normalizeText(canonicalName)
API->>DB: create alias base (nombre canónico normalizado)
API-->>FE: ok

U->>FE: Agregar alias
FE->>API: POST /api/aliases {groupId, canonicalName, alias}
API->>DB: find player por canonicalName en grupo
API->>NORM: normalizeText(alias)
API->>DB: create alias
API-->>FE: ok
```
