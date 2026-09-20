import { z } from 'zod';
import { openApiRegistry } from '@/core/openapi/registry';

export const SceneActionSchema = z.object({
    id: z.string().uuid(),
    deviceId: z.string().uuid(),
    action: z.string(),
    payload: z.record(z.any()),
    order: z.number(),
});

export const SceneResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    icon: z.string(),
    homeId: z.string().uuid(),
    actions: z.array(SceneActionSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const CreateSceneRequestSchema = z.object({
    name: z.string().min(1).max(50),
    icon: z.string().default('scene_default'),
    homeId: z.string().uuid(),
    actions: z.array(
        z.object({
            deviceId: z.string().uuid(),
            action: z.string().min(1),
            payload: z.record(z.any()).default({}),
            order: z.number().default(0),
        }),
    ),
});

export const TriggerSceneResponseSchema = z.object({
    success: z.boolean(),
    sceneId: z.string().uuid(),
    executedActionsCount: z.number(),
    message: z.string(),
});

export type SceneResponse = z.infer<typeof SceneResponseSchema>;
export type CreateSceneRequest = z.infer<typeof CreateSceneRequestSchema>;
export type TriggerSceneResponse = z.infer<typeof TriggerSceneResponseSchema>;

openApiRegistry.register('Scene', SceneResponseSchema);
openApiRegistry.register('CreateSceneRequest', CreateSceneRequestSchema);
openApiRegistry.register('TriggerSceneResponse', TriggerSceneResponseSchema);

openApiRegistry.registerPath({
    method: 'get',
    path: '/scenes',
    tags: ['Scenes'],
    summary: 'List all scenes',
    description: 'Returns all smart home scenes configured for the home.',
    responses: {
        200: {
            description: 'Scenes listed successfully',
            content: {
                'application/json': {
                    schema: z.array(SceneResponseSchema),
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/scenes',
    tags: ['Scenes'],
    summary: 'Create a new multi-device scene',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CreateSceneRequestSchema,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Scene created',
            content: {
                'application/json': {
                    schema: SceneResponseSchema,
                },
            },
        },
    },
});

openApiRegistry.registerPath({
    method: 'post',
    path: '/scenes/{id}/trigger',
    tags: ['Scenes'],
    summary: 'Trigger a scene execution',
    description: 'Executes all actions registered within the scene in sequence or parallel.',
    request: {
        params: z.object({ id: z.string().uuid() }),
    },
    responses: {
        200: {
            description: 'Scene triggered successfully',
            content: {
                'application/json': {
                    schema: TriggerSceneResponseSchema,
                },
            },
        },
        404: {
            description: 'Scene not found',
        },
    },
});
