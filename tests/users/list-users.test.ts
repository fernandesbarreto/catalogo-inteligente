import { ListUsers } from "../../src/use-cases/users/ListUsers";
import { makeRepo } from "./_mocks";

describe("ListUsers", () => {
  it("Should return users with default pagination", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([
      { id: "1", email: "a@example.com" },
      { id: "2", email: "b@example.com" },
    ]);

    const uc = new ListUsers(repo as any);
    const out = await uc.exec({});

    expect(repo.list).toHaveBeenCalledWith(0, 20);
    expect(out).toHaveLength(2);
  });

  it("calculates skip correctly", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue([]);
    const uc = new ListUsers(repo as any);
    await uc.exec({ page: 3, pageSize: 10 });
    expect(repo.list).toHaveBeenCalledWith(20, 10);
  });
});
