/**
 * O transporte tRPC depende exclusivamente do cookie de sessão local.
 *
 * Não ler sessionStorage nem emitir Authorization: Bearer aqui: o runtime
 * pode manter um token Manus/OAuth em formato JWT, incompatível com a sessão
 * local HMAC e capaz de provocar falhas de autenticação nas mutações.
 */
export function localTrpcHeaders(): Record<string, string> {
  return {};
}
