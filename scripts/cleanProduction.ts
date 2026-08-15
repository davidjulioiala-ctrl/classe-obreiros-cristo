import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

async function cleanProduction() {
  const db = await getDb();
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("Iniciando limpeza total de produção...");

  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);
  } catch (e) {}

  const tablesToTruncate = [
    "attendance",
    "activities",
    "tithes",
    "other_incomes",
    "expenses",
    "transfers",
    "members",
    "materials",
    "audit_logs",
    "system_settings",
    "header_templates",
    "backup_configs"
  ];

  for (const table of tablesToTruncate) {
    try {
      await db.execute(sql.raw(`DELETE FROM \`${table}\`;`));
      console.log(`Tabela ${table} limpa.`);
    } catch (e) {}
  }

  // Apagar todos os utilizadores excepto admin
  try {
    await db.execute(sql`DELETE FROM users WHERE username != 'admin';`);
    console.log("Utilizadores secundários removidos.");
  } catch (e) {}

  const passwordHash = crypto.createHash("sha256").update("admin123").digest("hex");
  const [adminCheck]: any = await db.execute(sql`SELECT id FROM users WHERE username = 'admin';`);
  
  if (!adminCheck || (Array.isArray(adminCheck) && adminCheck.length === 0)) {
    await db.execute(sql`
      INSERT INTO users (username, password, name, email, role)
      VALUES ('admin', ${passwordHash}, 'Administrador', 'admin@classe.local', 'admin');
    `);
    console.log("Utilizador admin criado.");
  } else {
    await db.execute(sql`
      UPDATE users SET password = ${passwordHash}, role = 'admin' WHERE username = 'admin';
    `);
    console.log("Utilizador admin actualizado.");
  }

  try {
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);
  } catch (e) {}

  // Repor exatamente 5 grupos neutros usando backticks na tabela groups
  const [groupRows]: any = await db.execute(sql`SELECT id FROM \`groups\` ORDER BY id ASC;`);
  const neutralNames = ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4", "Convidados"];

  if (Array.isArray(groupRows) && groupRows.length >= 5) {
    for (let i = 0; i < 5; i++) {
      const gId = groupRows[i].id;
      await db.execute(sql`UPDATE \`groups\` SET name = ${neutralNames[i]}, description = ${"Grupo estrutural neutro " + (i + 1)} WHERE id = ${gId};`);
    }
    for (let i = 5; i < groupRows.length; i++) {
      const gId = groupRows[i].id;
      await db.execute(sql`DELETE FROM \`groups\` WHERE id = ${gId};`);
    }
  } else {
    await db.execute(sql`DELETE FROM \`groups\`;`);
    for (let i = 0; i < 5; i++) {
      await db.execute(sql`
        INSERT INTO \`groups\` (name, description, criteria)
        VALUES (${neutralNames[i]}, ${"Grupo estrutural neutro " + (i + 1)}, 'Atribuição padrão');
      `);
    }
  }

  console.log("Limpeza total de produção concluída com sucesso!");
  process.exit(0);
}

cleanProduction().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
