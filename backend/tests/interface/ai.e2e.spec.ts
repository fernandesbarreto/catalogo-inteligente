import request from "supertest";
import { makeApp } from "../../src/app";

describe("AI Recommendations E2E Tests", () => {
  let app: any;

  beforeAll(async () => {
    app = makeApp();
  });

  describe("POST /ai/recommendations", () => {
    const validQueries = [
      "tinta branca para sala",
      "tinta resistente para cozinha",
      "tinta antimofo para banheiro",
    ];

    test.each(validQueries)(
      "should return valid JSON for query: %s",
      async (query) => {
        const startTime = Date.now();

        const response = await request(app)
          .post("/ai/recommendations")
          .send({ query })
          .expect(200);

        const executionTime = Date.now() - startTime;

        console.log(`[E2E Test] Query: "${query}"`);
        console.log(`[E2E Test] Status: ${response.status}`);
        console.log(
          `[E2E Test] Picks found: ${response.body.picks?.length || 0}`
        );
        console.log(`[E2E Test] Execution time: ${executionTime}ms`);

        // Verificar estrutura do JSON
        expect(response.body).toHaveProperty("picks");
        expect(response.body).toHaveProperty("notes");
        expect(Array.isArray(response.body.picks)).toBe(true);
        expect(typeof response.body.notes).toBe("string");

        // Verificar se picks tem estrutura correta
        if (response.body.picks.length > 0) {
          response.body.picks.forEach((pick: any) => {
            expect(pick).toHaveProperty("id");
            expect(pick).toHaveProperty("reason");
            expect(typeof pick.id).toBe("string");
            expect(typeof pick.reason).toBe("string");
            expect(pick.id.length).toBeGreaterThan(0);
            expect(pick.reason.length).toBeGreaterThan(0);
          });
        }

        // Verificar se notes não está vazio
        expect(response.body.notes.length).toBeGreaterThan(0);

        // Verificar latência
        expect(executionTime).toBeLessThan(10000); // 10 segundos máximo
      },
      15000
    );

    test("should handle empty query gracefully", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post("/ai/recommendations")
        .send({ query: "" })
        .expect(400);

      const executionTime = Date.now() - startTime;

      console.log(`[E2E Test] Empty query`);
      console.log(`[E2E Test] Status: ${response.status}`);
      console.log(`[E2E Test] Execution time: ${executionTime}ms`);

      // Para query vazia, deve retornar erro 400
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");

      // Verificar latência
      expect(executionTime).toBeLessThan(1000);
    }, 10000);

    test("should handle irrelevant queries correctly", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post("/ai/recommendations")
        .send({ query: "pizza saborosa italiana" })
        .expect(200);

      const executionTime = Date.now() - startTime;

      console.log(`[E2E Test] Irrelevant query`);
      console.log(`[E2E Test] Status: ${response.status}`);
      console.log(
        `[E2E Test] Picks found: ${response.body.picks?.length || 0}`
      );
      console.log(`[E2E Test] Execution time: ${executionTime}ms`);

      // Verificar estrutura do JSON
      expect(response.body).toHaveProperty("picks");
      expect(response.body).toHaveProperty("notes");
      expect(Array.isArray(response.body.picks)).toBe(true);
      expect(typeof response.body.notes).toBe("string");

      // Para queries irrelevantes, deve retornar picks vazios
      expect(response.body.picks).toEqual([]);
      expect(response.body.notes).toContain("Nenhuma tinta encontrada");

      // Verificar latência
      expect(executionTime).toBeLessThan(5000);
    }, 10000);

    test("should handle missing query parameter", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post("/ai/recommendations")
        .send({})
        .expect(400);

      const executionTime = Date.now() - startTime;

      console.log(`[E2E Test] Missing query parameter`);
      console.log(`[E2E Test] Status: ${response.status}`);
      console.log(`[E2E Test] Execution time: ${executionTime}ms`);

      // Para query ausente, deve retornar erro 400
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");

      // Verificar latência
      expect(executionTime).toBeLessThan(1000);
    }, 10000);

    test("should handle malformed JSON", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post("/ai/recommendations")
        .send("invalid json")
        .set("Content-Type", "application/json")
        .expect(400);

      const executionTime = Date.now() - startTime;

      console.log(`[E2E Test] Malformed JSON`);
      console.log(`[E2E Test] Status: ${response.status}`);
      console.log(`[E2E Test] Execution time: ${executionTime}ms`);

      // Deve retornar erro 400 para JSON malformado
      expect(response.status).toBe(400);

      // Verificar latência
      expect(executionTime).toBeLessThan(1000);
    }, 5000);
  });

  describe("Health Check", () => {
    test("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toEqual({ ok: true });
    });
  });
});
