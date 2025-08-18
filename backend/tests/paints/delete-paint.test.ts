import { DeletePaint } from "../../src/use-cases/paints/DeletePaint";
import { makeRepo } from "./_mocks";

describe("DeletePaint", () => {
  it("deleta por id", async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(undefined);
    const uc = new DeletePaint(repo as any);
    await uc.exec("p1");
    expect(repo.delete).toHaveBeenCalledWith("p1");
  });
});
