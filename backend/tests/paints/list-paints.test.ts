import { ListPaints } from "../../src/use-cases/paints/ListPaints";
import { makeRepo } from "./_mocks";

describe("ListPaints", () => {
  it("lista com paginação padrão", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([
      {
        id: "p1",
        name: "A",
        color: "#111",
        surfaceType: "indoor",
        roomType: "kitchen",
        finish: "matte",
      },
    ]);

    const uc = new ListPaints(repo as any);
    const out = await uc.exec({}); // page=1, pageSize=20

    expect(repo.list).toHaveBeenCalledWith(0, 20, undefined);
    expect(out).toHaveLength(1);
  });

  it("calcula skip corretamente", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([]);
    const uc = new ListPaints(repo as any);
    await uc.exec({ page: 3, pageSize: 10, q: "white" });
    expect(repo.list).toHaveBeenCalledWith(20, 10, "white");
  });
});
