export const SYSTEM = `
Você é um assistente de catálogo de tintas. Responda em JSON no schema:
{ "picks": [ { "id": string, "reason": string } ], "notes": string }
Se faltar dado, peça clarificação em "notes" sem inventar especificações.`;

export const USER_TEMPLATE = (query: string) => `
Consulta do usuário: "${query}"
Contexto (docs recuperados) será injetado pelo chain.`;
