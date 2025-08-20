import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Catálogo Inteligente API",
      version: "1.0.0",
      description:
        "API for managing users, paints, role-based access control, and AI-powered paint recommendations",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/bff",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "User unique identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "User creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "User last update timestamp",
            },
          },
          required: ["id", "email"],
        },
        CreateUserRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User password (minimum 6 characters)",
            },
          },
          required: ["email", "password"],
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User password (minimum 6 characters)",
            },
          },
        },
        LoginRequest: {
          type: "object",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              description: "User password",
            },
          },
          required: ["email", "password"],
        },
        LoginResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description: "JWT access token",
            },
          },
          required: ["accessToken"],
        },
        Paint: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Paint unique identifier",
            },
            name: {
              type: "string",
              description: "Paint name",
            },
            color: {
              type: "string",
              description: "Paint color name",
            },
            colorHex: {
              type: "string",
              pattern: "^#[0-9A-Fa-f]{6}$",
              description: "Paint color in hexadecimal format (e.g., #96E9B1)",
            },
            surfaceType: {
              type: "string",
              description: "Type of surface this paint is suitable for",
            },
            roomType: {
              type: "string",
              description: "Type of room this paint is suitable for",
            },
            finish: {
              type: "string",
              description: "Paint finish type",
            },
            features: {
              type: "string",
              description: "Additional paint features",
            },
            line: {
              type: "string",
              description: "Paint line/brand",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Paint creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Paint last update timestamp",
            },
          },
          required: ["id", "name", "color", "colorHex"],
        },
        CreatePaintRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Paint name",
            },
            color: {
              type: "string",
              description: "Paint color name",
            },
            colorHex: {
              type: "string",
              pattern: "^#[0-9A-Fa-f]{6}$",
              description: "Paint color in hexadecimal format (e.g., #96E9B1)",
            },
            surfaceType: {
              type: "string",
              description: "Type of surface this paint is suitable for",
            },
            roomType: {
              type: "string",
              description: "Type of room this paint is suitable for",
            },
            finish: {
              type: "string",
              description: "Paint finish type",
            },
            features: {
              type: "string",
              description: "Additional paint features",
            },
            line: {
              type: "string",
              description: "Paint line/brand",
            },
          },
          required: ["name", "color", "colorHex"],
        },
        UpdatePaintRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Paint name",
            },
            color: {
              type: "string",
              description: "Paint color name",
            },
            colorHex: {
              type: "string",
              pattern: "^#[0-9A-Fa-f]{6}$",
              description: "Paint color in hexadecimal format (e.g., #96E9B1)",
            },
            surfaceType: {
              type: "string",
              description: "Type of surface this paint is suitable for",
            },
            roomType: {
              type: "string",
              description: "Type of room this paint is suitable for",
            },
            finish: {
              type: "string",
              description: "Paint finish type",
            },
            features: {
              type: "string",
              description: "Additional paint features",
            },
            line: {
              type: "string",
              description: "Paint line/brand",
            },
          },
        },
        UserRoles: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User unique identifier",
            },
            roles: {
              type: "array",
              items: {
                type: "string",
                enum: ["ADMIN", "EDITOR", "VIEWER"],
              },
              description: "List of user roles",
            },
          },
          required: ["userId", "roles"],
        },
        AddRoleRequest: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["ADMIN", "EDITOR", "VIEWER"],
              description: "Role to add to user",
            },
          },
          required: ["role"],
        },
        // AI-related schemas
        ChatMessage: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["user", "assistant"],
              description: "Role of the message sender",
            },
            content: {
              type: "string",
              description: "Message content",
            },
          },
          required: ["role", "content"],
        },
        PaintFilters: {
          type: "object",
          properties: {
            surfaceType: {
              type: "string",
              description: "Filter by surface type",
            },
            roomType: {
              type: "string",
              description: "Filter by room type",
            },
            finish: {
              type: "string",
              description: "Filter by finish type",
            },
            line: {
              type: "string",
              description: "Filter by paint line/brand",
            },
          },
        },
        RecommendationQuery: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for paint recommendations",
            },
            filters: {
              $ref: "#/components/schemas/PaintFilters",
            },
            history: {
              type: "array",
              items: {
                $ref: "#/components/schemas/ChatMessage",
              },
              description: "Chat history for context",
            },
            routerActions: {
              type: "array",
              items: {
                type: "object",
              },
              description: "Pre-MCP router actions",
            },
          },
          required: ["query"],
        },
        RecommendationPick: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Paint ID",
            },
            reason: {
              type: "string",
              description: "Reason for recommendation",
            },
          },
          required: ["id", "reason"],
        },
        RecommendationResponse: {
          type: "object",
          properties: {
            picks: {
              type: "array",
              items: {
                $ref: "#/components/schemas/RecommendationPick",
              },
              description: "Recommended paints",
            },
            notes: {
              type: "string",
              description: "Additional notes about recommendations",
            },
            message: {
              type: "string",
              description: "Response message from AI",
            },
            imageUrl: {
              type: "string",
              description: "URL to generated palette image (if applicable)",
            },
          },
          required: ["picks"],
        },
        SemanticSearchRequest: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            limit: {
              type: "number",
              description: "Maximum number of results",
              default: 10,
            },
          },
          required: ["query"],
        },
        SemanticSearchResponse: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Paint",
              },
              description: "Search results",
            },
            scores: {
              type: "array",
              items: {
                type: "number",
              },
              description: "Similarity scores for results",
            },
          },
          required: ["results"],
        },
        PaletteImageRequest: {
          type: "object",
          properties: {
            colors: {
              type: "array",
              items: {
                type: "string",
                pattern: "^#[0-9A-Fa-f]{6}$",
              },
              description: "Array of hex colors for palette generation",
            },
            prompt: {
              type: "string",
              description: "Additional prompt for image generation",
            },
          },
          required: ["colors"],
        },
        PaletteImageResponse: {
          type: "object",
          properties: {
            imageUrl: {
              type: "string",
              description: "URL to generated palette image",
            },
            success: {
              type: "boolean",
              description: "Whether image generation was successful",
            },
          },
          required: ["imageUrl", "success"],
        },

        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Current page number",
            },
            pageSize: {
              type: "number",
              description: "Number of items per page",
            },
            total: {
              type: "number",
              description: "Total number of items",
            },
            totalPages: {
              type: "number",
              description: "Total number of pages",
            },
          },
          required: ["page", "pageSize", "total", "totalPages"],
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error code",
            },
            message: {
              type: "string",
              description: "Error message",
            },
          },
          required: ["error", "message"],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/interface/http/bff/controllers/*.ts",
    "./src/interface/http/bff/dto/*.ts",
  ],
};

export const specs = swaggerJsdoc(options);
