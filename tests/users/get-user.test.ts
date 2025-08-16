import { GetUser } from "../../src/use-cases/users/GetUser";
import { makeRepo } from "./_mocks";

describe("GetUser", () => {
  it("Should return user by id", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue({ id: "u1", email: "x@example.com" });

    const uc = new GetUser(repo as any);
    const out = await uc.exec("u1");

    expect(out).toEqual({ id: "u1", email: "x@example.com" });
    expect(repo.findById).toHaveBeenCalledWith("u1");
  });

  it("Should return null if user does not exist", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);
    const uc = new GetUser(repo as any);
    const out = await uc.exec("missing");
    expect(out).toBeNull();
  });
});
