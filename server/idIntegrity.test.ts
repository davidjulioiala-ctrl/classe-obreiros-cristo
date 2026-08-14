import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

function getBusinessTableBlocks() {
  return [...schemaSource.matchAll(/export const (\w+) = mysqlTable\("([^"]+)", \{([\s\S]*?)\n\}\);/g)].map((match) => ({
    exportName: match[1],
    tableName: match[2],
    body: match[3],
  }));
}

describe("integridade dos IDs do schema", () => {
  it("mantém um ID inteiro, auto-incremental e chave primária em cada tabela de negócio", () => {
    const tables = getBusinessTableBlocks();
    expect(tables.length).toBeGreaterThan(0);

    for (const table of tables) {
      expect(table.body, `${table.tableName} deve declarar id como int`).toMatch(/id:\s*int\("id"\)\.autoincrement\(\)\.primaryKey\(\)/);
    }
  });

  it("mantém as chaves estrangeiras de negócio como inteiros", () => {
    const relationshipFields = [...schemaSource.matchAll(/\b(\w+Id):\s*int\("\w+Id"\)/g)];
    expect(relationshipFields.length).toBeGreaterThan(0);
    expect(relationshipFields.every((match) => match[0].includes(": int("))).toBe(true);
  });
});

export { getBusinessTableBlocks };
