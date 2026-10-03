import { SDUIPage, SDUISection, SDUIComponent } from './schemas';
import { DeviceService } from '@/domains/devices/service';
import { SecurityService } from '@/domains/security/service';
import { EnergyService } from '@/domains/energy/service';
import { AutomationService } from '@/domains/automations/service';

export interface SduiService {
    getDashboardLayout(homeId?: string): Promise<SDUIPage>;
}

export class SduiServiceImpl implements SduiService {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly securityService: SecurityService,
        private readonly energyService: EnergyService,
        private readonly automationService: AutomationService,
    ) {}

    public async getDashboardLayout(homeId = 'default-home'): Promise<SDUIPage> {
        const targetHomeId = homeId && homeId !== 'default-home' ? homeId : undefined;
        // Fetch domain states concurrently
        const [devicesResult, securityResult, energyResult, automationsResult] = await Promise.allSettled([
            this.deviceService.listDevices({ homeId: targetHomeId }),
            this.securityService.getStatus(targetHomeId),
            this.energyService.getSummary('meter-main'),
            this.automationService.listAutomations(targetHomeId),
        ]);

        const devices = devicesResult.status === 'fulfilled' ? devicesResult.value : [];
        const security = securityResult.status === 'fulfilled' ? securityResult.value : { overallStatus: 'DISARMED', activeIncidentsCount: 0 };
        const energy = energyResult.status === 'fulfilled' ? energyResult.value : { currentPowerWatts: 850, dailyEnergyKwh: 12.4, phaseBalancePercentage: 99.1 };
        const automations = automationsResult.status === 'fulfilled' ? automationsResult.value : [];

        const sections: SDUISection[] = [];

        // 1. Hero Weather Section
        const weatherSection: SDUISection = {
            id: 'section_hero_weather',
            type: 'HERO_WEATHER',
            title: 'Weather & Ambient',
            order: 1,
            components: [
                {
                    id: 'comp_weather_header',
                    type: 'WEATHER_HEADER',
                    locationName: 'Home (Santiago)',
                    temperature: 22.5,
                    feelsLike: 23.0,
                    conditionText: 'Partly Cloudy',
                    conditionIcon: 'cloud.sun.fill',
                    humidity: 48,
                    windSpeed: 11.2,
                    action: {
                        type: 'NAVIGATE',
                        target: 'weather_detail',
                    },
                },
            ],
        };
        sections.push(weatherSection);

        // 2. Security Banner Section
        const securitySection: SDUISection = {
            id: 'section_security_banner',
            type: 'SECURITY_BANNER',
            title: 'Security Fleet',
            order: 2,
            components: [
                {
                    id: 'comp_security_status',
                    type: 'SECURITY_STATUS',
                    armStatus: security.overallStatus,
                    activeAlertsCount: security.activeIncidentsCount,
                    badgeText: security.activeIncidentsCount > 0 ? `${security.activeIncidentsCount} ALERTS` : 'SYSTEM SECURE',
                    actions: [
                        { type: 'ARM_SECURITY', command: 'DISARMED', params: { homeId } },
                        { type: 'ARM_SECURITY', command: 'ARMED_HOME', params: { homeId } },
                        { type: 'ARM_SECURITY', command: 'ARMED_AWAY', params: { homeId } },
                    ],
                },
            ],
        };
        sections.push(securitySection);

        // 3. Quick Shortcuts Section
        const shortcutsSection: SDUISection = {
            id: 'section_quick_shortcuts',
            type: 'QUICK_SHORTCUTS',
            title: 'Quick Actions',
            order: 3,
            columns: 4,
            components: [
                {
                    id: 'comp_shortcut_eco',
                    type: 'SHORTCUT_BUTTON',
                    label: 'Eco Mode',
                    icon: 'leaf.fill',
                    color: '#22C55E',
                    variant: 'PRIMARY',
                    action: {
                        type: 'EXECUTE_COMMAND',
                        command: 'set_eco_mode',
                        params: { enabled: true },
                    },
                },
                {
                    id: 'comp_shortcut_morning',
                    type: 'SHORTCUT_BUTTON',
                    label: 'Good Morning',
                    icon: 'sun.max.fill',
                    color: '#EAB308',
                    variant: 'TONAL',
                    action: {
                        type: 'TRIGGER_AUTOMATION',
                        target: 'routine_morning',
                    },
                },
                {
                    id: 'comp_shortcut_night',
                    type: 'SHORTCUT_BUTTON',
                    label: 'Good Night',
                    icon: 'moon.stars.fill',
                    color: '#6366F1',
                    variant: 'TONAL',
                    action: {
                        type: 'TRIGGER_AUTOMATION',
                        target: 'routine_night',
                    },
                },
                {
                    id: 'comp_shortcut_lights_off',
                    type: 'SHORTCUT_BUTTON',
                    label: 'All Off',
                    icon: 'power',
                    color: '#EF4444',
                    variant: 'TONAL',
                    action: {
                        type: 'EXECUTE_COMMAND',
                        command: 'turn_all_off',
                    },
                },
            ],
        };
        sections.push(shortcutsSection);

        // 4. Energy Summary Section
        const energySection: SDUISection = {
            id: 'section_energy_summary',
            type: 'ENERGY_OVERVIEW',
            title: 'Live Energy Telemetry',
            subtitle: 'Real-time 3-Phase Consumption',
            order: 4,
            columns: 3,
            components: [
                {
                    id: 'comp_energy_power',
                    type: 'STAT_TILE',
                    label: 'Active Load',
                    value: `${Math.round(energy.currentPowerWatts)}`,
                    unit: 'W',
                    icon: 'bolt.fill',
                    color: '#3B82F6',
                    secondaryLabel: 'Current load',
                },
                {
                    id: 'comp_energy_daily',
                    type: 'STAT_TILE',
                    label: 'Today Energy',
                    value: `${energy.dailyEnergyKwh.toFixed(1)}`,
                    unit: 'kWh',
                    icon: 'chart.bar.fill',
                    color: '#10B981',
                    secondaryLabel: 'Cumulative',
                },
                {
                    id: 'comp_energy_balance',
                    type: 'STAT_TILE',
                    label: 'Phase Balance',
                    value: `${energy.phaseBalancePercentage.toFixed(1)}`,
                    unit: '%',
                    icon: 'scale.3d',
                    color: '#8B5CF6',
                    secondaryLabel: 'Balanced',
                },
            ],
        };
        sections.push(energySection);

        // 5. Thermostats Section
        const thermostats = devices.filter((d) => d.type === 'THERMOSTAT');
        if (thermostats.length > 0) {
            const thermoComponents: SDUIComponent[] = thermostats.map((t) => {
                const ambient = (t.state?.ambientTemp as number) || (t.state?.temperature as number) || 21.0;
                const target = (t.state?.targetTemp as number) || 22.0;
                const mode = (t.state?.mode as string) || 'HEAT';
                const isEco = Boolean(t.state?.isEco);
                return {
                    id: `comp_thermo_${t.id}`,
                    type: 'THERMOSTAT_DIAL',
                    deviceId: t.id,
                    vendor: t.vendor,
                    name: t.name,
                    ambientTemp: ambient,
                    targetTemp: target,
                    mode,
                    isEco,
                    unit: '°C',
                    minTemp: 15.0,
                    maxTemp: 30.0,
                    primaryAction: {
                        type: 'EXECUTE_COMMAND',
                        deviceId: t.id,
                        command: 'set_temperature',
                    },
                };
            });

            sections.push({
                id: 'section_climate',
                type: 'DEVICE_GRID',
                title: 'Climate Control',
                order: 5,
                columns: 1,
                components: thermoComponents,
            });
        }

        // 6. Device Grid (Lights, Curtains, Bots, Plugs)
        const controllableDevices = devices.filter((d) => d.type !== 'THERMOSTAT' && d.type !== 'CAMERA' && d.type !== 'DOORBELL');
        if (controllableDevices.length > 0) {
            const deviceComponents: SDUIComponent[] = controllableDevices.map((dev) => {
                const isOn = Boolean(dev.state?.on || dev.state?.power === 'ON' || dev.state?.state === 'OPEN');
                const battery = typeof dev.state?.battery === 'number' ? dev.state.battery : undefined;
                return {
                    id: `comp_dev_${dev.id}`,
                    type: 'DEVICE_CARD',
                    deviceId: dev.id,
                    vendor: dev.vendor,
                    deviceType: dev.type,
                    name: dev.name,
                    subtitle: dev.vendor,
                    isOn,
                    isOnline: dev.isOnline,
                    batteryPercent: battery,
                    icon: this.getDeviceIcon(dev.type),
                    primaryAction: {
                        type: 'EXECUTE_COMMAND',
                        deviceId: dev.id,
                        command: 'toggle',
                        params: { on: !isOn },
                    },
                };
            });

            sections.push({
                id: 'section_devices',
                type: 'DEVICE_GRID',
                title: 'Connected Devices',
                subtitle: `${controllableDevices.length} Active Devices`,
                order: 6,
                columns: 2,
                components: deviceComponents,
            });
        }

        // 7. Unified Cameras Section
        const cameras = devices.filter((d) => d.type === 'CAMERA' || d.type === 'DOORBELL');
        if (cameras.length > 0) {
            const cameraComponents: SDUIComponent[] = cameras.map((cam) => ({
                id: `comp_cam_${cam.id}`,
                type: 'CAMERA_TILE',
                deviceId: cam.id,
                vendor: cam.vendor,
                name: cam.name,
                isArmed: Boolean(cam.state?.armed ?? true),
                isLive: true,
                batteryPercent: typeof cam.state?.battery === 'number' ? cam.state.battery : 85,
                action: {
                    type: 'NAVIGATE',
                    target: 'live_camera_player',
                    deviceId: cam.id,
                },
            }));

            sections.push({
                id: 'section_cameras',
                type: 'UNIFIED_CAMERAS',
                title: 'Live Camera Fleet',
                order: 7,
                columns: 2,
                components: cameraComponents,
            });
        }

        // 8. Automations Section
        if (automations.length > 0) {
            const autoComponents: SDUIComponent[] = automations.slice(0, 4).map((auto) => ({
                id: `comp_auto_${auto.id}`,
                type: 'AUTOMATION_ROW',
                automationId: auto.id,
                name: auto.name,
                triggerType: auto.triggerType,
                isEnabled: auto.isEnabled,
                icon: 'bolt.circle.fill',
                action: {
                    type: 'TRIGGER_AUTOMATION',
                    target: auto.id,
                },
            }));

            sections.push({
                id: 'section_automations',
                type: 'AUTOMATIONS_LIST',
                title: 'Smart Routines',
                order: 8,
                components: autoComponents,
            });
        }

        return {
            id: 'page_dashboard_user',
            title: 'My Smart Home',
            version: '1.4.0',
            generatedAt: new Date().toISOString(),
            refreshIntervalSeconds: 15,
            sections,
        };
    }

    private getDeviceIcon(type: string): string {
        switch (type) {
            case 'LIGHT':
                return 'lightbulb.fill';
            case 'CURTAIN':
                return 'curtains.closed';
            case 'BOT':
                return 'hand.tap.fill';
            case 'PLUG':
                return 'powerplug.fill';
            case 'SENSOR':
                return 'sensor.fill';
            default:
                return 'cube.fill';
        }
    }
}
