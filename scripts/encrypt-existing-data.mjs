import { encryptExistingSensitiveData } from "../server/db.ts";

try {
  const counts = await encryptExistingSensitiveData();
  console.log(JSON.stringify({ success: true, counts }));
} catch (error) {
  console.error("[DataEncryptionMigration]", error);
  process.exitCode = 1;
}
