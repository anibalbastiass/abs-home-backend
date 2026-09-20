import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
    docsSidebar: [
        {
            type: 'doc',
            id: 'intro',
            label: '🌟 Overview',
        },
        {
            type: 'category',
            label: '🚀 Getting Started',
            collapsed: false,
            items: [
                'getting-started/overview',
                'getting-started/local-setup',
            ],
        },
        {
            type: 'category',
            label: '🏛️ Architecture',
            collapsed: false,
            items: [
                'architecture/clean-domains',
                'architecture/dependency-injection',
                'architecture/rate-limiting-queues',
                'architecture/kafka-events',
                'architecture/error-handling',
            ],
        },
        {
            type: 'category',
            label: '📦 Domain Services',
            collapsed: false,
            items: [
                'domains/devices-and-adapters',
                'domains/scenes',
                'domains/automations',
                'domains/three-phase-energy',
                'domains/security',
                'domains/health',
            ],
        },
        {
            type: 'category',
            label: '☁️ Infrastructure & CI/CD',
            collapsed: true,
            items: [
                'infrastructure/database-and-prisma',
                'infrastructure/terraform',
                'infrastructure/cicd-deployment',
            ],
        },
        {
            type: 'category',
            label: '📖 API REST & Swagger',
            collapsed: false,
            items: [
                'api/swagger-ui',
                'api/openapi-spec',
            ],
        },
    ],
};

export default sidebars;
