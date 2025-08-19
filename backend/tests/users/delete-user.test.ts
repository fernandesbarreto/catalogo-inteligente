import { DeleteUser } from "../../src/use-cases/users/DeleteUser";
import { makeRepo } from "./_mocks";

describe("DeleteUser", () => {
  it("Should delete user by id", async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(undefined);

    const uc = new DeleteUser(repo as any);
    await uc.exec("u1");

    expect(repo.delete).toHaveBeenCalledWith("u1");
  });
});
