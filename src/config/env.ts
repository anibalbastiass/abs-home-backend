import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    API_PREFIX: z.string().default('/api/v1'),
    API_SECRET_KEY: z.string().default('abs_smarthome_super_secret_jwt_key_2026'),

    // PostgreSQL / Prisma
    DATABASE_URL: z.string().default('postgresql://abs_admin:abs_password_secure@localhost:5432/abs_smarthome?schema=public'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),

    // Kafka / Redpanda
    KAFKA_BROKERS: z.string().default('localhost:19092'),
    KAFKA_CLIENT_ID: z.string().default('abs-backend-gateway'),
    KAFKA_GROUP_ID: z.string().default('abs-backend-consumers'),

    // IoT Vendor API Credentials
    HUE_BRIDGE_IP: z.string().optional(),
    HUE_API_KEY: z.string().optional(),

    NEST_PROJECT_ID: z.string().optional(),
    NEST_CLIENT_ID: z.string().optional(),
    NEST_CLIENT_SECRET: z.string().optional(),
    NEST_REFRESH_TOKEN: z.string().optional(),

    SWITCHBOT_OPEN_TOKEN: z.string().optional(),
    SWITCHBOT_SECRET_KEY: z.string().optional(),

    RING_REFRESH_TOKEN: z.string().optional(),

    BLINK_USERNAME: z.string().optional(),
    BLINK_PASSWORD: z.string().optional(),

    // Energy Meter
    ENERGY_METER_IP: z.string().optional(),
    ENERGY_VOLTAGE_NOMINAL: z.coerce.number().default(220),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:', JSON.stringify(result.error.format(), null, 2));
        throw new Error('Invalid environment configuration');
    }
    return result.data;
};

export const env = parseEnv();
