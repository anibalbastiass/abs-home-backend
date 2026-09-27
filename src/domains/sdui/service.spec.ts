import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SduiServiceImpl } from './service';
import { SduiController } from './controller';
import { SDUIPageSchema, SDUIComponentSchema, SDUISectionSchema } from './schemas';
import { DeviceService } from '@/domains/devices/service';
import { SecurityService } from '@/domains/security/service';
import { EnergyService } from '@/domains/energy/service';
import { AutomationService } from '@/domains/automations/service';

describe('SduiService', () => {
    let service: SduiServiceImpl;
    let mockDeviceService: Partial<DeviceService>;
    let mockSecurityService: Partial<SecurityService>;
    let mockEnergyService: Partial<EnergyService>;
    let mockAutomationService: Partial<AutomationService>;

    beforeEach(() => {
        mockDeviceService = {
            listDevices: vi.fn().mockResolvedValue([
                {
                    id: 'dev-thermo',
                    vendor: 'NEST',
                    type: 'THERMOSTAT',
                    name: 'Living Room Thermostat',
                    state: { ambientTemp: 21.5, targetTemp: 22.0, mode: 'HEAT', isEco: false },
                    isOnline: true,
                },
                {
                    id: 'dev-light',
                    vendor: 'HUE',
                    type: 'LIGHT',
                    name: 'Ceiling Lamp',
                    state: { on: true },
                    isOnline: true,
                },
                {
                    id: 'dev-curtain',
                    vendor: 'SWITCHBOT',
                    type: 'CURTAIN',
                    name: 'Bedroom Curtain',
                    state: { state: 'OPEN', battery: 92 },
                    isOnline: true,
                },
                {
                    id: 'dev-cam',
                    vendor: 'RING',
                    type: 'CAMERA',
                    name: 'Front Doorbell',
                    state: { armed: true, battery: 88 },
                    isOnline: true,
                },
            ]),
        };

        mockSecurityService = {
            getStatus: vi.fn().mockResolvedValue({
                overallStatus: 'ARMED_HOME',
                activeIncidentsCount: 0,
                zones: [],
                recentIncidents: [],
            }),
        };

        mockEnergyService = {
            getSummary: vi.fn().mockResolvedValue({
                meterId: 'meter-main',
                currentPowerWatts: 1450,
                dailyEnergyKwh: 18.2,
                phaseBalancePercentage: 97.8,
                phases: {},
                latestSampleAt: new Date().toISOString(),
            }),
        };

        mockAutomationService = {
            listAutomations: vi.fn().mockResolvedValue([
                {
                    id: 'auto-1',
                    name: 'Sunset Mood Lights',
                    isEnabled: true,
                    triggerType: 'SUNSET',
                },
            ]),
        };

        service = new SduiServiceImpl(
            mockDeviceService as DeviceService,
            mockSecurityService as SecurityService,
            mockEnergyService as EnergyService,
            mockAutomationService as AutomationService,
        );
    });

    it('should generate a rich SDUIPage with all domain sections and components', async () => {
        const page = await service.getDashboardLayout('home-123');

        expect(page.id).toBe('page_dashboard_user');
        expect(page.title).toBe('My Smart Home');
        expect(page.sections.length).toBeGreaterThanOrEqual(7);

        // Weather
        const weatherSection = page.sections.find((s) => s.type === 'HERO_WEATHER');
        expect(weatherSection).toBeDefined();
        expect(weatherSection!.components[0].type).toBe('WEATHER_HEADER');
        expect(weatherSection!.components[0].locationName).toBe('Home (Santiago)');

        // Security
        const secSection = page.sections.find((s) => s.type === 'SECURITY_BANNER');
        expect(secSection).toBeDefined();
        expect(secSection!.components[0].type).toBe('SECURITY_STATUS');
        expect(secSection!.components[0].armStatus).toBe('ARMED_HOME');
        expect(secSection!.components[0].actions?.length).toBe(3);

        // Shortcuts
        const shortcutsSection = page.sections.find((s) => s.type === 'QUICK_SHORTCUTS');
        expect(shortcutsSection).toBeDefined();
        expect(shortcutsSection!.components.length).toBe(4);

        // Energy
        const energySection = page.sections.find((s) => s.type === 'ENERGY_OVERVIEW');
        expect(energySection).toBeDefined();
        expect(energySection!.components.length).toBe(3);
        expect(energySection!.components[0].value).toBe('1450');

        // Climate (Thermostat)
        const climateSection = page.sections.find((s) => s.id === 'section_climate');
        expect(climateSection).toBeDefined();
        expect(climateSection!.components[0].type).toBe('THERMOSTAT_DIAL');
        expect(climateSection!.components[0].ambientTemp).toBe(21.5);

        // Devices
        const devSection = page.sections.find((s) => s.id === 'section_devices');
        expect(devSection).toBeDefined();
        expect(devSection!.components.length).toBe(2); // light and curtain

        // Cameras
        const camSection = page.sections.find((s) => s.type === 'UNIFIED_CAMERAS');
        expect(camSection).toBeDefined();
        expect(camSection!.components[0].type).toBe('CAMERA_TILE');

        // Automations
        const autoSection = page.sections.find((s) => s.type === 'AUTOMATIONS_LIST');
        expect(autoSection).toBeDefined();
        expect(autoSection!.components[0].type).toBe('AUTOMATION_ROW');
    });

    it('should handle service failures gracefully and return fallback data', async () => {
        (mockDeviceService.listDevices as any).mockRejectedValueOnce(new Error('DB Error'));
        (mockSecurityService.getStatus as any).mockRejectedValueOnce(new Error('Sec Error'));
        (mockEnergyService.getSummary as any).mockRejectedValueOnce(new Error('Energy Error'));
        (mockAutomationService.listAutomations as any).mockRejectedValueOnce(new Error('Auto Error'));

        const page = await service.getDashboardLayout();
        expect(page).toBeDefined();
        expect(page.sections.length).toBeGreaterThanOrEqual(4); // weather, security, shortcuts, energy
    });

    it('should handle SduiController getDashboard invocation', async () => {
        const controller = new SduiController(service);
        const ctx = {
            query: { homeId: 'test-home' },
            status: 0,
            body: null,
        } as any;

        await controller.getDashboard(ctx);
        expect(ctx.status).toBe(200);
        expect(ctx.body).toBeDefined();
        expect((ctx.body as any).id).toBe('page_dashboard_user');
    });

    it('should validate SDUI schemas', () => {
        const parsed = SDUIComponentSchema.parse({
            id: 'test',
            type: 'STAT_TILE',
            label: 'Test',
            value: '100',
        });
        expect(parsed.id).toBe('test');

        const sectionParsed = SDUISectionSchema.parse({
            id: 'sec-1',
            type: 'HERO_WEATHER',
            components: [parsed],
        });
        expect(sectionParsed.id).toBe('sec-1');

        const pageParsed = SDUIPageSchema.parse({
            id: 'page-1',
            title: 'Test Page',
            generatedAt: new Date().toISOString(),
            sections: [sectionParsed],
        });
        expect(pageParsed.title).toBe('Test Page');
    });
});
