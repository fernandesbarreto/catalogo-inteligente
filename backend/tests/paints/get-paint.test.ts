import { GetPaint } from "../../src/use-cases/paints/GetPaint";
import { makeRepo } from "./_mocks";

describe("GetPaint", () => {
  it("retorna paint por id", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue({
      id: "p1",
      name: "A",
      color: "#111",
      surfaceType: "indoor",
      roomType: "bathroom",
      finish: "matte",
    });

    const uc = new GetPaint(repo as any);
    const out = await uc.exec("p1");

    expect(out).toMatchObject({ id: "p1", name: "A" });
    expect(repo.findById).toHaveBeenCalledWith("p1");
  });

  it("retorna null se não existir", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);
    const uc = new GetPaint(repo as any);
    const out = await uc.exec("missing");
    expect(out).toBeNull();
  });
});
