export class PaintNotFoundError extends Error {
  constructor(paintId: string) {
    super(`Tinta com id ${paintId} não encontrada`);
    this.name = "PaintNotFoundError";
  }
}

export class PaintValidationError extends Error {
  constructor(message: string) {
    super(`Paint validation error: ${message}`);
    this.name = "PaintValidationError";
  }
}

export class EmbeddingGenerationError extends Error {
  constructor(message: string) {
    super(`Embedding generation error: ${message}`);
    this.name = "EmbeddingGenerationError";
  }
}
