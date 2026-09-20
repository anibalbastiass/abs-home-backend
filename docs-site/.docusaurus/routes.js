import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/blog',
    component: ComponentCreator('/blog', '98b'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '7e1'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '206'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '35b'),
            routes: [
              {
                path: '/docs/api/openapi-spec',
                component: ComponentCreator('/docs/api/openapi-spec', '2a8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/api/swagger-ui',
                component: ComponentCreator('/docs/api/swagger-ui', '4af'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/clean-domains',
                component: ComponentCreator('/docs/architecture/clean-domains', '5f0'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/dependency-injection',
                component: ComponentCreator('/docs/architecture/dependency-injection', 'b9f'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/error-handling',
                component: ComponentCreator('/docs/architecture/error-handling', '467'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/kafka-events',
                component: ComponentCreator('/docs/architecture/kafka-events', 'a15'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/architecture/rate-limiting-queues',
                component: ComponentCreator('/docs/architecture/rate-limiting-queues', '1f2'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/automations',
                component: ComponentCreator('/docs/domains/automations', '00c'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/devices-and-adapters',
                component: ComponentCreator('/docs/domains/devices-and-adapters', '677'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/health',
                component: ComponentCreator('/docs/domains/health', 'baf'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/scenes',
                component: ComponentCreator('/docs/domains/scenes', 'cb4'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/security',
                component: ComponentCreator('/docs/domains/security', '319'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/domains/three-phase-energy',
                component: ComponentCreator('/docs/domains/three-phase-energy', '9f3'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/local-setup',
                component: ComponentCreator('/docs/getting-started/local-setup', '5c8'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/getting-started/overview',
                component: ComponentCreator('/docs/getting-started/overview', '659'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/infrastructure/cicd-deployment',
                component: ComponentCreator('/docs/infrastructure/cicd-deployment', 'be5'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/infrastructure/database-and-prisma',
                component: ComponentCreator('/docs/infrastructure/database-and-prisma', 'f12'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/infrastructure/terraform',
                component: ComponentCreator('/docs/infrastructure/terraform', 'ce6'),
                exact: true,
                sidebar: "docsSidebar"
              },
              {
                path: '/docs/intro',
                component: ComponentCreator('/docs/intro', '058'),
                exact: true,
                sidebar: "docsSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
