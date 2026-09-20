import fs from 'fs';
import path from 'path';
import { generateOpenApiDocument } from '../src/core/openapi/registry';

// Make sure all domains register their schemas and paths
import '../src/domains/health/schemas';
import '../src/domains/devices/schemas';
import '../src/domains/scenes/schemas';
import '../src/domains/automations/schemas';
import '../src/domains/energy/schemas';
import '../src/domains/security/schemas';

async function exportSpec() {
    console.log('Generating OpenAPI 3.1 Specification...');
    const spec = generateOpenApiDocument();

    const outputDir = path.resolve(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 4), 'utf-8');

    console.log(`✅ OpenAPI 3.1 Spec successfully exported to: ${outputPath}`);
}

exportSpec().catch((err) => {
    console.error('❌ Failed to export OpenAPI spec:', err);
    process.exit(1);
});
