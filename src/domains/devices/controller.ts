import { Context } from 'koa';
import { DeviceService } from './service';
import {
    ListDevicesQuerySchema,
    DeviceCommandRequestSchema,
    UpdateDeviceRequestSchema,
} from './schemas';

export class DeviceController {
    constructor(private readonly deviceService: DeviceService) {}

    public list = async (ctx: Context): Promise<void> => {
        const query = ListDevicesQuerySchema.parse(ctx.query);
        const devices = await this.deviceService.listDevices(query);
        ctx.status = 200;
        ctx.body = devices;
    };

    public getById = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const device = await this.deviceService.getDeviceById(id);
        ctx.status = 200;
        ctx.body = device;
    };

    public update = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const body = UpdateDeviceRequestSchema.parse(ctx.request.body);
        const updated = await this.deviceService.updateDevice(id, body);
        ctx.status = 200;
        ctx.body = updated;
    };

    public executeCommand = async (ctx: Context): Promise<void> => {
        const id = ctx.params.id;
        const body = DeviceCommandRequestSchema.parse(ctx.request.body);
        const result = await this.deviceService.executeCommand(id, body);
        ctx.status = 200;
        ctx.body = result;
    };
}
