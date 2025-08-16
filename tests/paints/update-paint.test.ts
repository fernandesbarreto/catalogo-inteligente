import { UpdatePaint } from "../../src/use-cases/paints/UpdatePaint";
import { makeRepo } from "./_mocks";

describe("UpdatePaint", () => {
  it("atualiza campos informados", async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue({
      id: "p1",
      name: "Snow White",
      color: "#FAFAFA",
      surfaceType: "indoor",
      roomType: "bedroom",
      finish: "matte",
      features: "washable",
      line: "Silk Touch",
    });

    const uc = new UpdatePaint(repo as any);
    const out = await uc.exec("p1", { color: "#FAFAFA" });

    expect(out).toMatchObject({ id: "p1", color: "#FAFAFA" });
    expect(repo.update).toHaveBeenCalledWith("p1", { color: "#FAFAFA" });
  });
});
