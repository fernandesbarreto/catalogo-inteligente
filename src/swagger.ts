import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Catálogo Inteligente API",
      version: "1.0.0",
      description:
        "API for managing users, paints, and role-based access control",
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
              description: "Paint color",
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
          required: ["id", "name"],
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
              description: "Paint color",
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
            line: {
              type: "string",
              description: "Paint line/brand",
            },
          },
          required: ["name"],
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
              description: "Paint color",
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
