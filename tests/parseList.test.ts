import { describe, expect, it } from "vitest";
import { parseList } from "../src/parseList";

describe("parseList", () => {
  it("parsea lista con numeraciones y descarta encabezados", () => {
    const input = `
Complejo hoy 20h
1) Fede
- Nico

✅ 3. Tomi
`;
    const parsed = parseList(input);
    expect(parsed.map((p) => p.normalized)).toEqual(["fede", "nico", "tomi"]);
  });

  it("ignora primera linea descriptiva con hora en formato 19.15", () => {
    const input = `
Aduana 19.15
Mika
Oso
`;
    const parsed = parseList(input);
    expect(parsed.map((p) => p.normalized)).toEqual(["mika", "oso"]);
  });

  it("ignora siempre la primera linea no vacia", () => {
    const input = `
Descripcion cualquiera
Mika
Oso
`;
    const parsed = parseList(input);
    expect(parsed.map((p) => p.normalized)).toEqual(["mika", "oso"]);
  });
});
