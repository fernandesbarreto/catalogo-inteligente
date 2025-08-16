export const makeRepo = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findRoles: jest.fn(),
  addRole: jest.fn(),
  removeRole: jest.fn(),
});
