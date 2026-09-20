import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
    title: 'ABS Smart Home Backend',
    tagline: 'High-Performance IoT Gateway, Control Plane & Automation Engine',
    favicon: 'img/favicon.ico',

    url: 'https://anibalbastiass.github.io',
    baseUrl: '/abs-home-backend/',
    trailingSlash: false,

    organizationName: 'anibalbastiass',
    projectName: 'abs-home-backend',

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                    editUrl: 'https://github.com/anibalbastiass/abs-home-backend/tree/main/docs-site/',
                },
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        image: 'img/docusaurus-social-card.jpg',
        colorMode: {
            defaultMode: 'dark',
            disableSwitch: false,
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'ABS Smart Home Backend',
            items: [
                {
                    type: 'docSidebar',
                    sidebarId: 'docsSidebar',
                    position: 'left',
                    label: 'Documentation',
                },
                {
                    href: 'pathname:///abs-home-backend/swagger/',
                    label: 'Swagger UI',
                    position: 'left',
                },
                {
                    href: 'https://github.com/anibalbastiass/abs-home-backend',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Architecture Overview',
                            to: '/docs/intro',
                        },
                        {
                            label: 'Clean Domains',
                            to: '/docs/architecture/clean-domains',
                        },
                        {
                            label: 'IoT Rate Limiting',
                            to: '/docs/architecture/rate-limiting-queues',
                        },
                    ],
                },
                {
                    title: 'Ecosystem',
                    items: [
                        {
                            label: 'ABS Home Manager (Mobile)',
                            href: 'https://github.com/anibalbastiass/abs-home-manager',
                        },
                        {
                            label: 'OpenAPI Specification',
                            to: '/docs/api/openapi-spec',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'GitHub Repository',
                            href: 'https://github.com/anibalbastiass/abs-home-backend',
                        },
                        {
                            label: 'Releases',
                            href: 'https://github.com/anibalbastiass/abs-home-backend/releases',
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} ABS Smart Home. Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ['bash', 'typescript', 'json', 'yaml', 'docker', 'hcl'],
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
