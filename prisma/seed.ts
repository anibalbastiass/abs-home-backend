import { PrismaClient, Role, DeviceVendor, DeviceType, ArmStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create or upsert Admin User
  const user = await prisma.user.upsert({
    where: { email: 'anibal@abshome.dev' },
    update: {},
    create: {
      email: 'anibal@abshome.dev',
      name: 'Anibal Bastias',
      role: Role.ADMIN,
    },
  });

  // 2. Create Home
  const home = await prisma.home.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Main Smart Residence',
      timezone: 'America/Santiago',
      address: 'Las Condes, Santiago, Chile',
      ownerId: user.id,
    },
  });

  // 3. Create Rooms
  const livingRoom = await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Living Room',
      icon: 'weekend',
      homeId: home.id,
    },
  });

  const masterBedroom = await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Master Bedroom',
      icon: 'bed',
      homeId: home.id,
    },
  });

  const kitchen = await prisma.room.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Kitchen',
      icon: 'kitchen',
      homeId: home.id,
    },
  });

  // 4. Create Devices across Vendors
  const hueCeilingLight = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.HUE,
        externalId: 'hue_light_living_ceiling',
      },
    },
    update: {},
    create: {
      externalId: 'hue_light_living_ceiling',
      vendor: DeviceVendor.HUE,
      type: DeviceType.LIGHT,
      name: 'Living Room Main Light',
      roomId: livingRoom.id,
      homeId: home.id,
      isOnline: true,
      state: { on: true, brightness: 85, colorTemp: 3000 },
      capabilities: ['on_off', 'brightness', 'color_temp', 'color_rgb'],
    },
  });

  const nestThermostat = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.NEST,
        externalId: 'nest_thermostat_hallway',
      },
    },
    update: {},
    create: {
      externalId: 'nest_thermostat_hallway',
      vendor: DeviceVendor.NEST,
      type: DeviceType.THERMOSTAT,
      name: 'Nest Learning Thermostat',
      roomId: livingRoom.id,
      homeId: home.id,
      isOnline: true,
      state: { currentTemp: 21.5, targetTemp: 22.0, mode: 'HEAT', humidity: 45 },
      capabilities: ['temperature_control', 'mode_select', 'eco_mode', 'humidity_read'],
    },
  });

  const switchbotCurtain = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.SWITCHBOT,
        externalId: 'sb_curtain_master_bed',
      },
    },
    update: {},
    create: {
      externalId: 'sb_curtain_master_bed',
      vendor: DeviceVendor.SWITCHBOT,
      type: DeviceType.CURTAIN,
      name: 'Master Bedroom Curtains',
      roomId: masterBedroom.id,
      homeId: home.id,
      isOnline: true,
      state: { position: 100, isMoving: false, battery: 92 },
      capabilities: ['open_close', 'position_percentage', 'battery_level'],
    },
  });

  const ringDoorbell = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.RING,
        externalId: 'ring_doorbell_front',
      },
    },
    update: {},
    create: {
      externalId: 'ring_doorbell_front',
      vendor: DeviceVendor.RING,
      type: DeviceType.DOORBELL,
      name: 'Front Door Video Doorbell',
      homeId: home.id,
      isOnline: true,
      state: { motionDetected: false, dingActive: false, battery: 88 },
      capabilities: ['live_stream', 'motion_alerts', 'doorbell_chime', 'two_way_audio'],
    },
  });

  const blinkGardenCam = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.BLINK,
        externalId: 'blink_cam_backyard',
      },
    },
    update: {},
    create: {
      externalId: 'blink_cam_backyard',
      vendor: DeviceVendor.BLINK,
      type: DeviceType.CAMERA,
      name: 'Backyard Outdoor Cam',
      homeId: home.id,
      isOnline: true,
      state: { armed: true, motionDetected: false, battery: 'OK', temperature: 19 },
      capabilities: ['arm_disarm', 'thumbnail_capture', 'motion_detection', 'liveview'],
    },
  });

  const energyMeter = await prisma.device.upsert({
    where: {
      vendor_externalId: {
        vendor: DeviceVendor.ENERGY_METER,
        externalId: 'shelly_3em_panel',
      },
    },
    update: {},
    create: {
      externalId: 'shelly_3em_panel',
      vendor: DeviceVendor.ENERGY_METER,
      type: DeviceType.ENERGY_METER,
      name: 'Three-Phase Smart Energy Meter',
      homeId: home.id,
      isOnline: true,
      state: {
        phaseA: { voltage: 221.4, current: 8.5, activePower: 1880, powerFactor: 0.96 },
        phaseB: { voltage: 220.8, current: 6.2, activePower: 1360, powerFactor: 0.95 },
        phaseC: { voltage: 222.1, current: 9.8, activePower: 2170, powerFactor: 0.97 },
        totalActivePower: 5410,
      },
      capabilities: ['three_phase_power', 'voltage_rms', 'current_rms', 'power_factor', 'energy_total'],
    },
  });

  // 5. Create Security Zones
  await prisma.securityZone.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Perimeter & Entrance',
      armStatus: ArmStatus.ARMED_HOME,
      homeId: home.id,
    },
  });

  // 6. Create Scenes
  const goodNightScene = await prisma.scene.upsert({
    where: { id: '00000000-0000-0000-0000-000000000030' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000030',
      name: 'Good Night',
      icon: 'bedtime',
      homeId: home.id,
      actions: {
        create: [
          {
            deviceId: hueCeilingLight.id,
            action: 'turn_off',
            payload: { on: false },
            order: 1,
          },
          {
            deviceId: switchbotCurtain.id,
            action: 'close',
            payload: { position: 0 },
            order: 2,
          },
          {
            deviceId: nestThermostat.id,
            action: 'set_temperature',
            payload: { targetTemp: 19.0 },
            order: 3,
          },
          {
            deviceId: blinkGardenCam.id,
            action: 'arm',
            payload: { armed: true },
            order: 4,
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded: User ${user.email}, Home "${home.name}", Scene "${goodNightScene.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
