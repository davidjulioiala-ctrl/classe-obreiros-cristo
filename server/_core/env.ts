export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  initialAdminBootstrapToken: process.env.INITIAL_ADMIN_BOOTSTRAP_TOKEN ?? "",
};

export function validateRuntimeConfiguration() {
  const missing: string[] = [];
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) missing.push("JWT_SECRET (mínimo de 32 caracteres)");
  if (!ENV.databaseUrl) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    throw new Error(`Configuração incompleta: defina ${missing.join(" e ")} antes de iniciar a aplicação. Consulte .env.example.`);
  }
}
