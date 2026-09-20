import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { OpenAPIObjectConfigV31 } from '@asteasolutions/zod-to-openapi/dist/v3.1/openapi-generator';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

export { z };
export const openApiRegistry = new OpenAPIRegistry();

// Register Bearer Authentication Security Scheme
openApiRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Provide your ABS API JWT Bearer token',
});

export const generateOpenApiDocument = (): ReturnType<OpenApiGeneratorV31['generateDocument']> => {
    const generator = new OpenApiGeneratorV31(openApiRegistry.definitions);

    const config: OpenAPIObjectConfigV31 = {
        openapi: '3.1.0',
        info: {
            title: 'ABS Smart Home Backend Gateway API',
            version: '1.2.0',
            description:
                'Unified IoT control plane, automation engine, and energy monitoring backend for Philips Hue, Google Nest, SwitchBot, Ring, and Amazon Blink.',
            contact: {
                name: 'ABS Smart Home Engineering',
                url: 'https://abshome.dev',
            },
        },
        servers: [
            {
                url: 'https://api.abshome.dev/api/v1',
                description: 'Production Cloud API Gateway',
            },
            {
                url: 'https://staging-api.abshome.dev/api/v1',
                description: 'Staging Environment',
            },
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Local Development Server',
            },
        ],
        security: [{ BearerAuth: [] }],
    };

    return generator.generateDocument(config);
};
