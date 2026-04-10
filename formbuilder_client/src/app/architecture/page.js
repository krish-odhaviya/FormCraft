"use client";

import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';

export default function ArchitecturePage() {
    const [activeSection, setActiveSection] = useState('overview');
    const mermaidRef = useRef(false);

    useEffect(() => {
        // Load Mermaid via script
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js";
        script.async = true;
        script.onload = () => {
            if (window.mermaid) {
                window.mermaid.initialize({ 
                    startOnLoad: true,
                    theme: 'base',
                    themeVariables: {
                        primaryColor: '#4f46e5',
                        primaryTextColor: '#fff',
                        primaryBorderColor: '#3730a3',
                        lineColor: '#818cf8',
                        secondaryColor: '#10b981',
                        tertiaryColor: '#1e293b'
                    }
                });
                window.mermaid.contentLoaded();
            }
        };
        document.body.appendChild(script);

        // Intersection Observer for animations and nav
        const revealElements = document.querySelectorAll('.architecture-reveal');
        const observerOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));

        return () => {
            document.body.removeChild(script);
            observer.disconnect();
        };
    }, []);

    return (
        <div className="architecture-page">
            <style jsx>{`
                .architecture-page {
                    --primary: #4f46e5;
                    --primary-light: #818cf8;
                    --primary-dark: #3730a3;
                    --secondary: #10b981;
                    --accent: #f59e0b;
                    --bg-dark: #0f172a;
                    --bg-card: #1e293b;
                    --text-main: #f1f5f9;
                    --text-muted: #94a3b8;
                    --border: #334155;
                    --glass: rgba(30, 41, 59, 0.7);
                    
                    background-color: var(--bg-dark);
                    color: var(--text-main);
                    min-height: 100vh;
                    font-family: var(--font-sans), sans-serif;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                }

                header {
                    min-height: 400px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at center, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
                    position: relative;
                    padding: 60px 0;
                    text-align: center;
                }

                .header-image {
                    max-width: 500px;
                    width: 100%;
                    margin: 0 auto 2rem;
                    filter: drop-shadow(0 0 30px rgba(79, 70, 229, 0.3));
                    display: block;
                }

                h1 {
                    font-size: 3.5rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #fff 0%, var(--primary-light) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 0.5rem;
                }

                .subtitle {
                    font-size: 1.25rem;
                    color: var(--text-muted);
                    max-width: 600px;
                    margin: 0 auto;
                }

                nav {
                    position: sticky;
                    top: 20px;
                    z-index: 100;
                    background: var(--glass);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 10px 20px;
                    margin: 20px 0;
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                }

                nav a {
                    color: var(--text-muted);
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.3s ease;
                    padding: 5px 12px;
                    border-radius: 8px;
                }

                nav a:hover, nav a.active {
                    color: white;
                    background: var(--primary);
                }

                section {
                    padding: 80px 0;
                    border-bottom: 1px solid var(--border);
                }

                h2 {
                    font-size: 2.25rem;
                    margin-bottom: 2.5rem;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                h2::before {
                    content: '';
                    display: inline-block;
                    width: 8px;
                    height: 35px;
                    background: var(--primary);
                    border-radius: 4px;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }

                .card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 24px;
                    transition: transform 0.3s ease, border-color 0.3s ease;
                }

                .card h3 {
                    font-size: 1.25rem;
                    margin-bottom: 1rem;
                    color: var(--primary-light);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .diagram-container {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    margin: 2rem 0;
                    display: flex;
                    justify-content: center;
                    box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
                    overflow-x: auto;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1.5rem 0;
                    background: rgba(0,0,0,0.2);
                    border-radius: 12px;
                    overflow: hidden;
                }

                th, td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--border);
                }

                th {
                    background: var(--primary-dark);
                    color: white;
                }

                code {
                    font-family: 'JetBrains Mono', monospace;
                    background: #000;
                    color: #d1d5db;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .badge {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    background: var(--primary);
                    color: white;
                }

                .auth-badge { background: #6366f1; }
                .form-badge { background: #ec4899; }
                .runtime-badge { background: #8b5cf6; }
                .admin-badge { background: #f43f5e; }

                .architecture-reveal {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.8s ease;
                }

                .architecture-reveal.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>

            <header>
                <div className="container architecture-reveal visible">
                    <img src="/architecture_header.png" alt="Architecture Header" className="header-image" />
                    <h1>System Architecture</h1>
                    <p className="subtitle">A comprehensive technical blueprint of the FormCraft Dynamic Form Builder Ecosystem</p>
                </div>
            </header>

            <div className="container">
                <nav>
                    <a href="#overview" className={activeSection === 'overview' ? 'active' : ''}>Overview</a>
                    <a href="#data-flow" className={activeSection === 'data-flow' ? 'active' : ''}>Data Flow</a>
                    <a href="#database" className={activeSection === 'database' ? 'active' : ''}>Database Design</a>
                    <a href="#api" className={activeSection === 'api' ? 'active' : ''}>API Reference</a>
                    <a href="#security" className={activeSection === 'security' ? 'active' : ''}>Security</a>
                    <a href="#roles" className={activeSection === 'roles' ? 'active' : ''}>Roles</a>
                    <a href="#deep-dive" className={activeSection === 'deep-dive' ? 'active' : ''}>Deep Dive</a>
                </nav>

                {/* OVERVIEW */}
                <section id="overview" className="architecture-reveal">
                    <h2>System Overview</h2>
                    <div className="grid">
                        <div className="card">
                            <h3>Frontend (Client)</h3>
                            <p>Built with <strong>Next.js 15+ (App Router)</strong>. Handles form construction, dynamic rendering of published forms, and administrative dashboards.</p>
                        </div>
                        <div className="card">
                            <h3>Backend (API)</h3>
                            <p>Powered by <strong>Spring Boot 3.5+</strong>. Manages business logic, dynamic schema generation, and session-based authentication.</p>
                        </div>
                        <div className="card">
                            <h3>Database</h3>
                            <p>Utilizes <strong>PostgreSQL</strong>. Features a hybrid design with static metadata tables and dynamic transaction tables for form submissions.</p>
                        </div>
                    </div>

                    <div className="diagram-container">
                        <div className="mermaid">
                        {`graph LR
                            subgraph Client["Frontend (Next.js)"]
                                UI[User Interface]
                                FR[Form Renderer]
                                FB[Form Builder]
                            end
                            
                            subgraph API["Backend (Spring Boot)"]
                                SC[SecurityFilterChain]
                                CTRL[REST Controllers]
                                SVC[Business Services]
                                JPA[Spring Data JPA]
                                JT[JdbcTemplate]
                            end
                            
                            subgraph DB["Database (PostgreSQL)"]
                                ST[Static Tables]
                                DT[Dynamic Tables]
                            end
                            
                            UI --> SC
                            SC --> CTRL
                            CTRL --> SVC
                            SVC --> JPA
                            SVC --> JT
                            JPA --> ST
                            JT --> DT`}
                        </div>
                    </div>
                </section>

                {/* DATA FLOW */}
                <section id="data-flow" className="architecture-reveal">
                    <h2>Data Flow Architecture</h2>
                    <div className="card">
                        <h3>1. Form Publishing Flow</h3>
                        <p>When a builder clicks 'Publish', the system transition from metadata to physical structure.</p>
                        <div className="diagram-container">
                            <div className="mermaid">
                            {`sequenceDiagram
                                participant User as Builder
                                participant FE as Next.js Client
                                participant BE as Spring Boot (SchemaService)
                                participant DB as PostgreSQL
                                
                                User->>FE: Click Publish
                                FE->>BE: POST /api/forms/{id}/publish
                                BE->>BE: Sanitize Field Keys
                                BE->>BE: Generate SQL (CREATE/ALTER TABLE)
                                BE->>DB: Execute DDL Statements
                                BE->>DB: Update Form Status to 'PUBLISHED'
                                BE-->>FE: 200 OK (Success)
                                FE-->>User: Show Published URL`}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                        <h3>2. Request/Response Flow (MVC)</h3>
                        <p>Standard architectural pattern for handling API requests through the stack.</p>
                        <div className="diagram-container">
                            <div className="mermaid">
                            {`graph TD
                                RQ[Request] --> SEC[Security Layer]
                                SEC --> CON[Controller]
                                CON --> DTO[DTO Validation]
                                DTO --> SVC[Service Layer]
                                SVC --> REP[Repository/Dynamic SQL]
                                REP --> PGS[PostgreSQL]
                                PGS --> RES[Response Payload]
                                RES --> CON`}
                            </div>
                        </div>
                    </div>
                </section>

                {/* DATABASE */}
                <section id="database" className="architecture-reveal">
                    <h2>Entity & Database Design</h2>
                    <p>FormCraft uses a sophisticated EAV-alternative where each form gets its own physical table for optimized performance and querying.</p>
                    
                    <div className="diagram-container">
                        <div className="mermaid">
                        {`erDiagram
                            USER ||--o{ USER_ROLE : has
                            ROLE ||--o{ USER_ROLE : assigned_to
                            ROLE ||--o{ ROLE_MODULE : accesses
                            MODULE ||--o{ ROLE_MODULE : belongs_to
                            
                            USER ||--o{ FORM : owns
                            FORM ||--o{ FORM_VERSION : contains
                            FORM_VERSION ||--o{ FORM_FIELD : defines
                            FORM_FIELD ||--o{ FIELD_VALIDATION : has
                            
                            FORM ||--o{ FORM_PERMISSION : shared_with
                            USER ||--o{ FORM_PERMISSION : granted_to
                            
                            FORM ||--o{ FORM_SUBMISSION_META : tracks
                            FORM_SUBMISSION_META }o--|| FORM_VERSION : based_on
                            
                            DYNAMIC_TABLE {
                                uuid id PK
                                timestamp created_at
                                boolean is_draft
                                uuid form_version_id
                                string field_name_1
                                string field_name_n
                            }`}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Layer</th>
                                <th>Entities</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Identity</strong></td>
                                <td>User, Role, UserRole</td>
                                <td>Core RBAC system for application access.</td>
                            </tr>
                            <tr>
                                <td><strong>Form Core</strong></td>
                                <td>Form, FormVersion, FormField</td>
                                <td>Versioning system allows editing drafts while keeping public forms stable.</td>
                            </tr>
                            <tr>
                                <td><strong>Governance</strong></td>
                                <td>Module, RoleModule, FormPermission</td>
                                <td>Granular control over specific features and individual form sharing.</td>
                            </tr>
                            <tr>
                                <td><strong>Capture</strong></td>
                                <td>FormSubmissionMeta, Dynamic Tables</td>
                                <td>Metadata tracking and high-performance dynamic storage.</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* API REFERENCE */}
                <section id="api" className="architecture-reveal">
                    <h2>API Endpoints Architecture</h2>
                    <div className="grid">
                        <div className="card">
                            <h3><span className="badge auth-badge">AUTH</span> Authentication</h3>
                            <ul>
                                <li><code>POST /api/v1/auth/login</code></li>
                                <li><code>POST /api/v1/auth/logout</code></li>
                                <li><code>POST /api/v1/auth/register</code></li>
                                <li><code>GET /api/v1/auth/me</code></li>
                            </ul>
                        </div>
                        <div className="card">
                            <h3><span className="badge form-badge">FORMS</span> Management</h3>
                            <ul>
                                <li><code>GET /api/v1/forms</code></li>
                                <li><code>POST /api/v1/forms</code></li>
                                <li><code>PUT /api/v1/forms/{"{id}"}/publish</code></li>
                            </ul>
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem' }}>
                        <h3>Controller & Frontend Mapping</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Controller</th>
                                    <th>Work (Purpose)</th>
                                    <th>Frontend Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>AuthController</strong></td>
                                    <td>Identity management & Session creation.</td>
                                    <td><code>/login</code>, <code>/register</code></td>
                                </tr>
                                <tr>
                                    <td><strong>FormController</strong></td>
                                    <td>Form metadata & Visibility settings.</td>
                                    <td>Dashboard, Form Workspace</td>
                                </tr>
                                <tr>
                                    <td><strong>FormBuilderController</strong></td>
                                    <td>Builder interface & field structures.</td>
                                    <td><code>/forms/[id]/edit</code></td>
                                </tr>
                                <tr>
                                    <td><strong>FormSubmissionController</strong></td>
                                    <td>Processing and exporting submitted data.</td>
                                    <td><code>/forms/[id]/submissions</code></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECURITY */}
                <section id="security" className="architecture-reveal">
                    <h2>Security Architecture</h2>
                    <div className="grid">
                        <div className="card">
                            <h3>Authentication</h3>
                            <p>Session-based authentication using <strong>Spring Security 6</strong>.</p>
                        </div>
                        <div className="card">
                            <h3>CSRF Protection</h3>
                            <p>Enabled for all mutating requests via <code>XSRF-TOKEN</code>.</p>
                        </div>
                    </div>
                    <div className="diagram-container">
                        <div className="mermaid">
                        {`graph TD
                            A[Client Request] --> B{CORS Check}
                            B -- Pass --> D{CSRF Token Valid?}
                            D -- Yes --> F{Authentication?}
                            F -- Authenticated --> H[Role Check]
                            H -- Success --> I[Execute Logic]`}
                        </div>
                    </div>
                </section>

                {/* ROLES */}
                <section id="roles" className="architecture-reveal">
                    <h2>Roles & Permissions Matrix</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Role</th>
                                <th>Form Create</th>
                                <th>Form Edit</th>
                                <th>Admin Access</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>SYSTEM_ADMIN</strong></td>
                                <td>✅ Yes</td>
                                <td>✅ Yes</td>
                                <td>✅ Full Control</td>
                            </tr>
                            <tr>
                                <td><strong>PROJECT_MANAGER</strong></td>
                                <td>✅ Yes</td>
                                <td>✅ Yes</td>
                                <td>❌ None</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {/* DEEP DIVES */}
                <section id="deep-dive" className="architecture-reveal">
                    <h2>Technical Deep Dives</h2>
                    <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
                        <div className="card">
                            <h3>1. Dynamic Schema Engine</h3>
                            <p>How FormCraft converts UI layouts into physical PostgreSQL architecture.</p>
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px' }}>
                                <ol style={{ marginLeft: '20px', color: 'var(--text-muted)' }}>
                                    <li>Sanitization: label to safe column name.</li>
                                    <li>DDL Generation: CREATE/ALTER table commands.</li>
                                    <li>Data integrity: Drift detection on startup.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <footer style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                <div className="container">
                    <p>&copy; 2026 FormCraft Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
