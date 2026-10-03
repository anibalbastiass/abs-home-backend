import { PrismaClient } from '@prisma/client';
import { env, EnvConfig } from '@/config/env';
import { prisma } from '@/core/database/prisma';
import { queueManager, QueueManager } from '@/core/queues/queue-manager';
import { kafkaManager, KafkaClientManager } from '@/core/events/kafka-client';
import { WsManager, wsManager as defaultWsManager } from '@/core/websocket/ws-manager';
import { WsEventBridge } from '@/core/websocket/event-bridge';

// Adapters
import { HueAdapter, hueAdapter } from '@/domains/devices/adapters/hue.adapter';
import { NestAdapter, nestAdapter } from '@/domains/devices/adapters/nest.adapter';
import { SwitchBotAdapter, switchbotAdapter } from '@/domains/devices/adapters/switchbot.adapter';
import { RingAdapter, ringAdapter } from '@/domains/devices/adapters/ring.adapter';
import { BlinkAdapter, blinkAdapter } from '@/domains/devices/adapters/blink.adapter';

// Services
import { HealthService, HealthServiceImpl } from '@/domains/health/service';
import { DeviceService, DeviceServiceImpl } from '@/domains/devices/service';
import { SceneService, SceneServiceImpl } from '@/domains/scenes/service';
import { AutomationService, AutomationServiceImpl } from '@/domains/automations/service';
import { EnergyService, EnergyServiceImpl } from '@/domains/energy/service';
import { SecurityService, SecurityServiceImpl } from '@/domains/security/service';
import { SduiService, SduiServiceImpl } from '@/domains/sdui/service';
import { SyncService, SyncServiceImpl } from '@/domains/sync/service';
import { FirebaseTokenVerifier, TokenVerifier } from '@/domains/sync/token-verifier';

// Controllers
import { HealthController } from '@/domains/health/controller';
import { DeviceController } from '@/domains/devices/controller';
import { SceneController } from '@/domains/scenes/controller';
import { AutomationController } from '@/domains/automations/controller';
import { EnergyController } from '@/domains/energy/controller';
import { SecurityController } from '@/domains/security/controller';
import { SduiController } from '@/domains/sdui/controller';
import { SyncController } from '@/domains/sync/controller';

export interface AppContainer {
    // Infrastructure
    env: EnvConfig;
    prisma: PrismaClient;
    queueManager: QueueManager;
    kafkaManager: KafkaClientManager;
    wsManager: WsManager;
    wsEventBridge: WsEventBridge;

    // Adapters
    hueAdapter: HueAdapter;
    nestAdapter: NestAdapter;
    switchbotAdapter: SwitchBotAdapter;
    ringAdapter: RingAdapter;
    blinkAdapter: BlinkAdapter;

    // Services
    healthService: HealthService;
    deviceService: DeviceService;
    sceneService: SceneService;
    automationService: AutomationService;
    energyService: EnergyService;
    securityService: SecurityService;
    sduiService: SduiService;
    syncService: SyncService;
    syncTokenVerifier: TokenVerifier;

    // Controllers
    healthController: HealthController;
    deviceController: DeviceController;
    sceneController: SceneController;
    automationController: AutomationController;
    energyController: EnergyController;
    securityController: SecurityController;
    sduiController: SduiController;
    syncController: SyncController;
}

export const createContainer = (overrides: Partial<AppContainer> = {}): AppContainer => {
    const config = overrides.env || env;
    const db = overrides.prisma || prisma;
    const qm = overrides.queueManager || queueManager;
    const km = overrides.kafkaManager || kafkaManager;

    const hue = overrides.hueAdapter || hueAdapter;
    const nest = overrides.nestAdapter || nestAdapter;
    const sb = overrides.switchbotAdapter || switchbotAdapter;
    const ring = overrides.ringAdapter || ringAdapter;
    const blink = overrides.blinkAdapter || blinkAdapter;

    const healthSvc = overrides.healthService || new HealthServiceImpl(db, qm, config);
    const deviceSvc = overrides.deviceService || new DeviceServiceImpl(db, qm, km, hue, nest, sb, ring, blink);
    const sceneSvc = overrides.sceneService || new SceneServiceImpl(db, deviceSvc);
    const autoSvc = overrides.automationService || new AutomationServiceImpl(db, deviceSvc, km);
    const energySvc = overrides.energyService || new EnergyServiceImpl(db, km);
    const securitySvc = overrides.securityService || new SecurityServiceImpl(db, km);
    const sduiSvc = overrides.sduiService || new SduiServiceImpl(deviceSvc, securitySvc, energySvc, autoSvc);
    const syncSvc = overrides.syncService || new SyncServiceImpl(db);
    const tokenVerifier = overrides.syncTokenVerifier || new FirebaseTokenVerifier(config.FIREBASE_PROJECT_ID);

    const wsMgr = overrides.wsManager || defaultWsManager;
    wsMgr.setDeviceService(deviceSvc);
    const wsBridge = overrides.wsEventBridge || new WsEventBridge(km, wsMgr);

    const healthCtrl = overrides.healthController || new HealthController(healthSvc);
    const deviceCtrl = overrides.deviceController || new DeviceController(deviceSvc);
    const sceneCtrl = overrides.sceneController || new SceneController(sceneSvc);
    const autoCtrl = overrides.automationController || new AutomationController(autoSvc);
    const energyCtrl = overrides.energyController || new EnergyController(energySvc);
    const securityCtrl = overrides.securityController || new SecurityController(securitySvc);
    const sduiCtrl = overrides.sduiController || new SduiController(sduiSvc);
    const syncCtrl = overrides.syncController || new SyncController(syncSvc, tokenVerifier);

    return {
        env: config,
        prisma: db,
        queueManager: qm,
        kafkaManager: km,
        wsManager: wsMgr,
        wsEventBridge: wsBridge,
        hueAdapter: hue,
        nestAdapter: nest,
        switchbotAdapter: sb,
        ringAdapter: ring,
        blinkAdapter: blink,
        healthService: healthSvc,
        deviceService: deviceSvc,
        sceneService: sceneSvc,
        automationService: autoSvc,
        energyService: energySvc,
        securityService: securitySvc,
        sduiService: sduiSvc,
        syncService: syncSvc,
        syncTokenVerifier: tokenVerifier,
        healthController: healthCtrl,
        deviceController: deviceCtrl,
        sceneController: sceneCtrl,
        automationController: autoCtrl,
        energyController: energyCtrl,
        securityController: securityCtrl,
        sduiController: sduiCtrl,
        syncController: syncCtrl,
    };
};
