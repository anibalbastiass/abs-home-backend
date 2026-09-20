import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

export default function Home(): React.JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout
            title={`${siteConfig.title}`}
            description="High-Performance IoT Gateway, Control Plane & Automation Engine"
        >
            <header className={clsx('hero hero--primary')}>
                <div className="container">
                    <h1 className="hero__title">{siteConfig.title}</h1>
                    <p className="hero__subtitle" style={{ color: '#cbd5e1', fontSize: '1.25rem', maxWidth: '800px', margin: '1rem auto' }}>
                        {siteConfig.tagline}
                    </p>
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Link
                            className="button button--primary button--lg"
                            to="/docs/intro"
                            style={{ fontWeight: 'bold' }}
                        >
                            🚀 Explore Documentation
                        </Link>
                        <Link
                            className="button button--secondary button--lg"
                            to="/docs/api/swagger-ui"
                            style={{ fontWeight: 'bold' }}
                        >
                            📖 REST API & Swagger
                        </Link>
                    </div>
                </div>
            </header>
            <main style={{ padding: '4rem 0' }}>
                <div className="container">
                    <div className="row">
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>🏛️ Clean Architecture & DI</h3>
                                <p>
                                    Fully decoupled domain layer with Constructor Dependency Injection, strong domain contracts, and RFC 7807 problem details error handling.
                                </p>
                            </div>
                        </div>
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>⚡ BullMQ IoT Rate Limiting</h3>
                                <p>
                                    Sliding-window token bucket limiters on Redis 7 to throttle commands for Philips Hue, Google Nest, SwitchBot, Ring, and Blink.
                                </p>
                            </div>
                        </div>
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>📡 Redpanda / Kafka Events</h3>
                                <p>
                                    Real-time domain event streaming across device state changes, automation triggers, security alarms, and energy telemetry.
                                </p>
                            </div>
                        </div>
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>⚡ Three-Phase Energy</h3>
                                <p>
                                    Sub-second power telemetry monitoring Phase A, B, C active power, current, voltage, and phase balance percentage.
                                </p>
                            </div>
                        </div>
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>🧪 80% Test Coverage Gate</h3>
                                <p>
                                    Comprehensive co-located unit (<code>*.spec.ts</code>) and integration (<code>*.ispec.ts</code>) tests with shared fixture factories.
                                </p>
                            </div>
                        </div>
                        <div className="col col--4" style={{ marginBottom: '1.5rem' }}>
                            <div className="featureCard">
                                <h3>☁️ Terraform & DigitalOcean</h3>
                                <p>
                                    Automated Infrastructure as Code deploying to DigitalOcean App Platform with managed PostgreSQL 16 and Redis 7 clusters.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}
