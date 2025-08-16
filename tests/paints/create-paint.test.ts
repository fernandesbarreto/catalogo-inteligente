import { CreatePaint } from "../../src/use-cases/paints/CreatePaint";
import { makeRepo } from "./_mocks";

describe("CreatePaint", () => {
  it("cria tinta válida", async () => {
    const repo = makeRepo();
    repo.create.mockResolvedValue({
      id: "p1",
      name: "Snow White",
      color: "#FFFFFF",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });

    const uc = new CreatePaint(repo as any);
    const out = await uc.exec({
      name: "Snow White",
      color: "#FFFFFF",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });

    expect(out).toMatchObject({ id: "p1", name: "Snow White" });
    expect(repo.create).toHaveBeenCalledWith({
      name: "Snow White",
      color: "#FFFFFF",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });
  });

  it("falha se faltar campos obrigatórios", async () => {
    const repo = makeRepo();
    const uc = new CreatePaint(repo as any);

    await expect(
      uc.exec({
        name: "",
        color: "",
        surfaceType: "",
        roomType: "",
        finish: "",
      } as any)
    ).rejects.toThrow();
  });
});
