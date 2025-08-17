export const makeRepo = () => ({
  create: jest.fn(),
  createWithEmbedding: jest.fn(),
  findById: jest.fn(),
  list: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});
