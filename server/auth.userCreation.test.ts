import { describe, expect, it } from "vitest";
import { UserCreationError } from "./auth";

describe("criação de utilizadores", () => {
  it("expõe mensagens seguras para nomes de utilizador e emails duplicados", () => {
    expect(new UserCreationError("duplicate_username").message).toBe("O nome de utilizador já existe.");
    expect(new UserCreationError("duplicate_email").message).toBe("O email já está associado a outro utilizador.");
  });

  it("não expõe detalhes internos da base de dados", () => {
    expect(new UserCreationError("database").message).toBe("Não foi possível guardar o utilizador na base de dados.");
    expect(new UserCreationError("database").message).not.toContain("SQL");
  });
});
