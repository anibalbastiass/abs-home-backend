import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/core/errors/app-error';
import { logger } from '@/core/logger/logger';
import { DeviceService } from '../devices/service';
import {
    CreateSceneRequest,
    SceneResponse,
    TriggerSceneResponse,
} from './schemas';

export interface SceneService {
    listScenes(homeId?: string): Promise<SceneResponse[]>;
    getSceneById(id: string): Promise<SceneResponse>;
    createScene(req: CreateSceneRequest): Promise<SceneResponse>;
    triggerScene(id: string): Promise<TriggerSceneResponse>;
}

export class SceneServiceImpl implements SceneService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly deviceService: DeviceService,
    ) {}

    public async listScenes(homeId?: string): Promise<SceneResponse[]> {
        const scenes = await this.prisma.scene.findMany({
            where: homeId ? { homeId } : {},
            include: {
                actions: {
                    orderBy: { order: 'asc' },
                },
            },
            orderBy: { name: 'asc' },
        });

        return scenes.map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.icon,
            homeId: s.homeId,
            actions: s.actions.map((a) => ({
                id: a.id,
                deviceId: a.deviceId,
                action: a.action,
                payload: (a.payload as Record<string, unknown>) || {},
                order: a.order,
            })),
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
        }));
    }

    public async getSceneById(id: string): Promise<SceneResponse> {
        const scene = await this.prisma.scene.findUnique({
            where: { id },
            include: {
                actions: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!scene) {
            throw new NotFoundError(`Scene with ID "${id}" was not found`);
        }

        return {
            id: scene.id,
            name: scene.name,
            icon: scene.icon,
            homeId: scene.homeId,
            actions: scene.actions.map((a) => ({
                id: a.id,
                deviceId: a.deviceId,
                action: a.action,
                payload: (a.payload as Record<string, unknown>) || {},
                order: a.order,
            })),
            createdAt: scene.createdAt.toISOString(),
            updatedAt: scene.updatedAt.toISOString(),
        };
    }

    public async createScene(req: CreateSceneRequest): Promise<SceneResponse> {
        const scene = await this.prisma.scene.create({
            data: {
                name: req.name,
                icon: req.icon,
                homeId: req.homeId,
                actions: {
                    create: req.actions.map((a, idx) => ({
                        deviceId: a.deviceId,
                        action: a.action,
                        payload: a.payload,
                        order: a.order ?? idx,
                    })),
                },
            },
            include: {
                actions: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        return {
            id: scene.id,
            name: scene.name,
            icon: scene.icon,
            homeId: scene.homeId,
            actions: scene.actions.map((a) => ({
                id: a.id,
                deviceId: a.deviceId,
                action: a.action,
                payload: (a.payload as Record<string, unknown>) || {},
                order: a.order,
            })),
            createdAt: scene.createdAt.toISOString(),
            updatedAt: scene.updatedAt.toISOString(),
        };
    }

    public async triggerScene(id: string): Promise<TriggerSceneResponse> {
        const scene = await this.getSceneById(id);
        logger.info({ sceneId: id, sceneName: scene.name, actionsCount: scene.actions.length }, 'Triggering scene execution');

        let executedCount = 0;
        for (const action of scene.actions) {
            try {
                await this.deviceService.executeCommand(action.deviceId, {
                    action: action.action,
                    params: action.payload,
                });
                executedCount++;
            } catch (err) {
                logger.error({ err, deviceId: action.deviceId, action: action.action }, 'Error executing scene action');
            }
        }

        return {
            success: true,
            sceneId: id,
            executedActionsCount: executedCount,
            message: `Scene "${scene.name}" executed ${executedCount} actions successfully.`,
        };
    }
}
