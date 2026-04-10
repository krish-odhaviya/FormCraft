"use client";

import React, { useEffect } from 'react';

export default function ArchitecturePage() {
    useEffect(() => {
        // Handle smooth scrolling for anchor links
        const handleAnchorClick = (e) => {
            const href = e.currentTarget.getAttribute('href');
            if (href?.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const elem = document.getElementById(targetId);
                if (elem) {
                    elem.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        const anchors = document.querySelectorAll('a[href^="#"]');
        anchors.forEach(a => a.addEventListener('click', handleAnchorClick));

        return () => {
            anchors.forEach(a => a.removeEventListener('click', handleAnchorClick));
        };
    }, []);

    return (
        <div className="architecture-root">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');

                :root {
                    --bg: #060a0f;
                    --bg2: #0c1218;
                    --bg3: #111820;
                    --border: rgba(255,255,255,0.07);
                    --border2: rgba(255,255,255,0.12);
                    --text: #e2e8f0;
                    --muted: #64748b;
                    --accent: #38bdf8;
                    --accent2: #818cf8;
                    --accent3: #34d399;
                    --accent4: #fb923c;
                    --accent5: #f472b6;
                    --accent6: #facc15;
                    --danger: #f87171;
                    --glow: rgba(56,189,248,0.15);
                    --glow2: rgba(129,140,248,0.15);
                }

                .architecture-root {
                    font-family: 'JetBrains Mono', monospace;
                    background: var(--bg);
                    color: var(--text);
                    min-height: 100vh;
                    overflow-x: hidden;
                    margin: 0;
                    padding: 0;
                }

                .architecture-root * { margin:0; padding:0; box-sizing:border-box; }

                /* ── NAV ── */
                .architecture-root nav {
                    position: sticky; top: 0; z-index: 100;
                    background: rgba(6,10,15,0.92);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border);
                    padding: 0 2rem;
                    display: flex; align-items: center; gap: 2rem;
                    height: 56px;
                }
                .architecture-root .nav-brand {
                    font-family: 'Syne', sans-serif;
                    font-weight: 800; font-size: 1rem;
                    color: var(--accent); letter-spacing: -0.02em;
                    white-space: nowrap;
                }
                .architecture-root .nav-brand span { color: var(--accent2); }
                .architecture-root .nav-links {
                    display: flex; gap: 0; overflow-x: auto; scrollbar-width: none;
                }
                .architecture-root .nav-links::-webkit-scrollbar { display: none; }
                .architecture-root .nav-link {
                    font-size: 0.65rem; font-weight: 500;
                    color: var(--muted); text-decoration: none;
                    padding: 0.35rem 0.75rem; border-radius: 4px;
                    white-space: nowrap; transition: all 0.2s;
                    letter-spacing: 0.05em;
                }
                .architecture-root .nav-link:hover { color: var(--text); background: var(--bg3); }

                /* ── HERO ── */
                .architecture-root .hero {
                    padding: 4rem 2rem 2rem;
                    max-width: 1400px; margin: 0 auto;
                    position: relative;
                }
                .architecture-root .hero::before {
                    content: '';
                    position: absolute; top: 0; left: 0; right: 0; height: 400px;
                    background: radial-gradient(ellipse 60% 50% at 30% 0%, rgba(56,189,248,0.06) 0%, transparent 70%),
                                radial-gradient(ellipse 40% 40% at 80% 20%, rgba(129,140,248,0.05) 0%, transparent 70%);
                    pointer-events: none;
                }
                .architecture-root .hero-label {
                    font-size: 0.6rem; letter-spacing: 0.2em; color: var(--accent);
                    text-transform: uppercase; margin-bottom: 1rem;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .architecture-root .hero-label::before {
                    content: ''; width: 20px; height: 1px; background: var(--accent);
                }
                .architecture-root h1 {
                    font-family: 'Syne', sans-serif;
                    font-size: clamp(2rem, 5vw, 3.5rem);
                    font-weight: 800; line-height: 1.1;
                    letter-spacing: -0.03em;
                    color: #fff;
                    margin-bottom: 1rem;
                }
                .architecture-root h1 em { color: var(--accent); font-style: normal; }
                .architecture-root .hero-meta {
                    display: flex; gap: 2rem; flex-wrap: wrap;
                    font-size: 0.65rem; color: var(--muted); margin-top: 1.5rem;
                }
                .architecture-root .hero-meta span { display: flex; align-items: center; gap: 0.4rem; }
                .architecture-root .dot { width: 6px; height: 6px; border-radius: 50%; }

                /* ── SECTION ── */
                .architecture-root section {
                    max-width: 1400px; margin: 0 auto;
                    padding: 3rem 2rem;
                    border-top: 1px solid var(--border);
                }
                .architecture-root .section-header {
                    display: flex; align-items: center; gap: 1rem;
                    margin-bottom: 2rem;
                }
                .architecture-root .section-num {
                    font-size: 0.55rem; letter-spacing: 0.15em;
                    color: var(--muted); text-transform: uppercase;
                    min-width: 32px;
                }
                .architecture-root h2 {
                    font-family: 'Syne', sans-serif;
                    font-size: 1.1rem; font-weight: 700;
                    letter-spacing: -0.01em; color: #fff;
                }
                .architecture-root h3 {
                    font-family: 'Syne', sans-serif;
                    font-size: 0.85rem; font-weight: 700;
                    color: var(--text); margin-bottom: 0.75rem;
                    letter-spacing: 0.01em;
                }
                .architecture-root .tag {
                    font-size: 0.55rem; font-weight: 500;
                    padding: 0.2rem 0.5rem; border-radius: 3px;
                    letter-spacing: 0.08em; text-transform: uppercase;
                }

                /* ── CARDS ── */
                .architecture-root .card {
                    background: var(--bg2);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 1.25rem;
                    transition: border-color 0.2s;
                }
                .architecture-root .card:hover { border-color: var(--border2); }
                .architecture-root .card-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                }
                .architecture-root .card-grid-3 {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                }

                /* ── TECH STACK ── */
                .architecture-root .stack-row {
                    display: flex; flex-wrap: wrap; gap: 0.5rem;
                    margin-top: 0.75rem;
                }
                .architecture-root .tech-pill {
                    font-size: 0.6rem; padding: 0.25rem 0.6rem;
                    border-radius: 3px; border: 1px solid var(--border2);
                    color: var(--muted); background: var(--bg3);
                    letter-spacing: 0.05em;
                }
                .architecture-root .tech-pill.highlight { color: var(--accent); border-color: rgba(56,189,248,0.3); background: rgba(56,189,248,0.06); }
                .architecture-root .tech-pill.highlight2 { color: var(--accent2); border-color: rgba(129,140,248,0.3); background: rgba(129,140,248,0.06); }

                /* ── FLOW DIAGRAM ── */
                .architecture-root .flow {
                    display: flex; align-items: center;
                    gap: 0; flex-wrap: wrap;
                    margin: 1.5rem 0;
                }
                .architecture-root .flow-node {
                    background: var(--bg3);
                    border: 1px solid var(--border2);
                    border-radius: 6px;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.62rem; font-weight: 500;
                    color: var(--text); white-space: nowrap;
                    position: relative;
                }
                .architecture-root .flow-arrow {
                    font-size: 0.7rem; color: var(--muted);
                    padding: 0 0.5rem;
                }
                .architecture-root .flow-node.accent { border-color: rgba(56,189,248,0.4); color: var(--accent); background: rgba(56,189,248,0.06); }
                .architecture-root .flow-node.accent2 { border-color: rgba(129,140,248,0.4); color: var(--accent2); background: rgba(129,140,248,0.06); }
                .architecture-root .flow-node.accent3 { border-color: rgba(52,211,153,0.4); color: var(--accent3); background: rgba(52,211,153,0.06); }
                .architecture-root .flow-node.accent4 { border-color: rgba(251,146,60,0.4); color: var(--accent4); background: rgba(251,146,60,0.06); }
                .architecture-root .flow-node.accent5 { border-color: rgba(244,114,182,0.4); color: var(--accent5); background: rgba(244,114,182,0.06); }
                .architecture-root .flow-node.danger  { border-color: rgba(248,113,113,0.4); color: var(--danger); background: rgba(248,113,113,0.06); }

                /* ── ENDPOINT TABLE ── */
                .architecture-root .ep-group { margin-bottom: 2rem; }
                .architecture-root .ep-group-title {
                    font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase;
                    color: var(--accent); margin-bottom: 0.75rem;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .architecture-root .ep-group-title::after {
                    content: ''; flex: 1; height: 1px; background: rgba(56,189,248,0.15);
                }
                .architecture-root table { width: 100%; border-collapse: collapse; }
                .architecture-root th {
                    font-size: 0.55rem; letter-spacing: 0.1em; text-transform: uppercase;
                    color: var(--muted); font-weight: 500;
                    text-align: left; padding: 0.5rem 0.75rem;
                    border-bottom: 1px solid var(--border);
                }
                .architecture-root td {
                    font-size: 0.6rem; padding: 0.5rem 0.75rem;
                    border-bottom: 1px solid var(--border);
                    vertical-align: top; line-height: 1.5;
                }
                .architecture-root tr:last-child td { border-bottom: none; }
                .architecture-root tr:hover td { background: rgba(255,255,255,0.02); }

                .architecture-root .method {
                    font-weight: 700; font-size: 0.55rem;
                    padding: 0.15rem 0.4rem; border-radius: 3px;
                    letter-spacing: 0.06em;
                }
                .architecture-root .GET    { background: rgba(52,211,153,0.15); color: var(--accent3); }
                .architecture-root .POST   { background: rgba(56,189,248,0.15); color: var(--accent); }
                .architecture-root .PUT    { background: rgba(251,146,60,0.15); color: var(--accent4); }
                .architecture-root .DELETE { background: rgba(248,113,113,0.15); color: var(--danger); }

                .architecture-root .ep-path {
                    font-family: 'JetBrains Mono', monospace;
                    color: var(--text);
                }
                .architecture-root .ep-access { font-size: 0.55rem; }
                .architecture-root .access-pub  { color: var(--accent3); }
                .architecture-root .access-auth { color: var(--accent); }
                .architecture-root .access-admin { color: var(--accent5); }
                .architecture-root .access-owner { color: var(--accent4); }

                /* ── ENTITY ── */
                .architecture-root .entity-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 1rem;
                }
                .architecture-root .entity {
                    background: var(--bg2);
                    border: 1px solid var(--border);
                    border-radius: 8px; overflow: hidden;
                }
                .architecture-root .entity-head {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; justify-content: space-between;
                }
                .architecture-root .entity-name {
                    font-family: 'Syne', sans-serif;
                    font-size: 0.8rem; font-weight: 700;
                }
                .architecture-root .entity-fields { padding: 0.75rem 1rem; }
                .architecture-root .field-row {
                    display: flex; gap: 0.5rem; align-items: baseline;
                    padding: 0.2rem 0; font-size: 0.58rem;
                    border-bottom: 1px solid rgba(255,255,255,0.03);
                }
                .architecture-root .field-row:last-child { border-bottom: none; }
                .architecture-root .field-name { color: var(--text); flex: 1; }
                .architecture-root .field-type { color: var(--muted); font-size: 0.5rem; }
                .architecture-root .field-pk { color: var(--accent6); font-size: 0.5rem; font-weight: 700; }
                .architecture-root .field-fk { color: var(--accent4); font-size: 0.5rem; }
                .architecture-root .field-idx { color: var(--accent3); font-size: 0.5rem; }

                /* ── ROLE TABLE ── */
                .architecture-root .role-grid {
                    display: grid; gap: 1rem;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                }
                .architecture-root .role-card {
                    background: var(--bg2); border: 1px solid var(--border);
                    border-radius: 8px; overflow: hidden;
                }
                .architecture-root .role-head {
                    padding: 0.75rem 1rem; border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .architecture-root .role-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .architecture-root .role-title { font-family: 'Syne', sans-serif; font-size: 0.78rem; font-weight: 700; }
                .architecture-root .role-desc { font-size: 0.57rem; color: var(--muted); padding: 0.5rem 1rem; }
                .architecture-root .perm-list { padding: 0 1rem 0.75rem; }
                .architecture-root .perm-item {
                    display: flex; align-items: center; gap: 0.5rem;
                    font-size: 0.58rem; padding: 0.2rem 0;
                    color: var(--muted);
                }
                .architecture-root .perm-check { font-size: 0.65rem; }
                .architecture-root .perm-check.on { color: var(--accent3); }
                .architecture-root .perm-check.off { color: var(--danger); opacity: 0.5; }
                .architecture-root .perm-check.cond { color: var(--accent6); }

                /* ── SECURITY ── */
                .architecture-root .sec-grid {
                    display: grid; gap: 1rem;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                }
                .architecture-root .sec-card {
                    background: var(--bg2); border: 1px solid var(--border);
                    border-radius: 8px; padding: 1.25rem;
                }
                .architecture-root .sec-icon { font-size: 1.2rem; margin-bottom: 0.5rem; }
                .architecture-root .sec-list { margin-top: 0.5rem; }
                .architecture-root .sec-item {
                    font-size: 0.6rem; color: var(--muted);
                    padding: 0.2rem 0; padding-left: 0.75rem;
                    position: relative; line-height: 1.5;
                }
                .architecture-root .sec-item::before {
                    content: '─'; position: absolute; left: 0;
                    color: var(--border2);
                }

                /* ── LIFECYCLE ── */
                .architecture-root .lifecycle {
                    display: flex; gap: 0; flex-wrap: wrap;
                    margin: 1rem 0; align-items: center;
                }
                .architecture-root .lc-step {
                    background: var(--bg3); border: 1px solid var(--border2);
                    border-radius: 5px; padding: 0.4rem 0.7rem;
                    font-size: 0.6rem; font-weight: 500;
                    color: var(--text);
                }
                .architecture-root .lc-arrow { padding: 0 0.4rem; color: var(--border2); font-size: 0.7rem; }

                /* ── MVC GRID ── */
                .architecture-root .mvc-grid {
                    display: grid; grid-template-columns: 1fr 1fr 1fr;
                    gap: 1px; background: var(--border);
                    border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
                }
                @media(max-width:700px) { .architecture-root .mvc-grid { grid-template-columns: 1fr; } }
                .architecture-root .mvc-col {
                    background: var(--bg2); padding: 1rem;
                }
                .architecture-root .mvc-col-head {
                    font-size: 0.55rem; letter-spacing: 0.15em; text-transform: uppercase;
                    margin-bottom: 0.75rem; font-weight: 600;
                    padding-bottom: 0.5rem; border-bottom: 1px solid var(--border);
                }
                .architecture-root .mvc-item {
                    font-size: 0.6rem; color: var(--muted);
                    padding: 0.2rem 0; display: flex; align-items: baseline; gap: 0.4rem;
                }
                .architecture-root .mvc-item .name { color: var(--text); font-weight: 500; }

                /* ── DIVIDERS ── */
                .architecture-root .sep { height: 1px; background: var(--border); margin: 1.5rem 0; }

                /* ── RESPONSE BLOCKS ── */
                .architecture-root pre {
                    background: var(--bg3); border: 1px solid var(--border);
                    border-radius: 6px; padding: 1rem;
                    font-size: 0.6rem; overflow-x: auto; line-height: 1.7;
                    color: var(--text);
                }
                .architecture-root .k { color: var(--accent2); }
                .architecture-root .s { color: var(--accent3); }
                .architecture-root .n { color: var(--accent6); }
                .architecture-root .c { color: var(--muted); }

                /* ── SCROLLBAR ── */
                .architecture-root ::-webkit-scrollbar { width: 6px; height: 6px; }
                .architecture-root ::-webkit-scrollbar-track { background: var(--bg); }
                .architecture-root ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

                /* ── RESPONSIVE ── */
                @media(max-width:600px) {
                    .architecture-root nav { padding: 0 1rem; }
                    .architecture-root section { padding: 2rem 1rem; }
                    .architecture-root .hero { padding: 2rem 1rem 1rem; }
                }
            `}</style>

            <div dangerouslySetInnerHTML={{ __html: `
<!-- NAV -->
<nav>
  <div class="nav-brand">Form<span>Craft</span> · Architecture</div>
  <div class="nav-links">
    <a class="nav-link" href="#overview">Overview</a>
    <a class="nav-link" href="#stack">Stack</a>
    <a class="nav-link" href="#dataflow">Data Flow</a>
    <a class="nav-link" href="#mvc">MVC</a>
    <a class="nav-link" href="#endpoints">API Endpoints</a>
    <a class="nav-link" href="#entities">Database</a>
    <a class="nav-link" href="#security">Security</a>
    <a class="nav-link" href="#roles">Roles & Permissions</a>
    <a class="nav-link" href="#modules">Module System</a>
    <a class="nav-link" href="#lifecycle">Form Lifecycle</a>
    <a class="nav-link" href="#request-response">Req/Res Flow</a>
  </div>
</nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-label">System Architecture Document</div>
  <h1>FormCraft<br><em>Platform Architecture</em></h1>
  <p style="font-size:0.68rem;color:var(--muted);max-width:560px;line-height:1.7;">
    A full-stack form builder platform with drag-and-drop field composition, multi-version publishing, 
    conditional logic, role-based access control, and a dynamic module permission system.
  </p>
  <div class="hero-meta">
    <span><span class="dot" style="background:var(--accent)"></span> Next.js 14 Frontend</span>
    <span><span class="dot" style="background:var(--accent2)"></span> Spring Boot Backend</span>
    <span><span class="dot" style="background:var(--accent3)"></span> REST API · /api/v1</span>
    <span><span class="dot" style="background:var(--accent4)"></span> Session + CSRF Auth</span>
    <span><span class="dot" style="background:var(--accent5)"></span> RBAC + Module Permissions</span>
  </div>
</div>

<!-- ── 1. SYSTEM OVERVIEW ── -->
<section id="overview">
  <div class="section-header">
    <div class="section-num">01</div>
    <h2>System Overview</h2>
  </div>

  <div class="flow" style="margin-bottom:2rem;">
    <div class="flow-node accent">Browser / Client</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node accent2">Next.js App Router</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node">Axios + CSRF</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node accent3">Spring Boot REST API</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node">Spring Security</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node accent4">Service Layer</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node accent5">JPA / Repository</div>
    <div class="flow-arrow">→</div>
    <div class="flow-node danger">Database (SQL)</div>
  </div>

  <div class="card-grid">
    <div class="card">
      <h3>Frontend Layer</h3>
      <p style="font-size:0.6rem;color:var(--muted);line-height:1.7;margin-bottom:0.75rem;">
        Next.js 14 App Router with React Server/Client components. AuthContext manages session state globally. 
        AuthGuard and useAdminGuard protect routes. Sidebar is dynamically built from user's assigned module menu returned by <code>/api/v1/menu</code>.
      </p>
      <div class="stack-row">
        <span class="tech-pill highlight">Next.js 14</span>
        <span class="tech-pill highlight">React 18</span>
        <span class="tech-pill">Axios</span>
        <span class="tech-pill">Lucide Icons</span>
        <span class="tech-pill">React Hot Toast</span>
      </div>
    </div>
    <div class="card">
      <h3>API Gateway</h3>
      <p style="font-size:0.6rem;color:var(--muted);line-height:1.7;margin-bottom:0.75rem;">
        All requests are routed through a shared Axios instance with CSRF token injection (from <code>XSRF-TOKEN</code> cookie). 
        401 responses auto-redirect to <code>/login</code>. Response envelope is automatically unwrapped by interceptor.
      </p>
      <div class="stack-row">
        <span class="tech-pill highlight">BASE_URL: /api/v1</span>
        <span class="tech-pill">withCredentials: true</span>
        <span class="tech-pill">XSRF-TOKEN</span>
        <span class="tech-pill">Response Interceptor</span>
      </div>
    </div>
    <div class="card">
      <h3>Backend Layer</h3>
      <p style="font-size:0.6rem;color:var(--muted);line-height:1.7;margin-bottom:0.75rem;">
        Spring Boot REST API with Spring Security. MVC pattern: Controllers → Services → Repositories → Entities. 
        Session-based auth with CSRF protection. Role + Module permission enforcement at controller level.
      </p>
      <div class="stack-row">
        <span class="tech-pill highlight2">Spring Boot</span>
        <span class="tech-pill highlight2">Spring Security</span>
        <span class="tech-pill">Spring Data JPA</span>
        <span class="tech-pill">Hibernate</span>
      </div>
    </div>
    <div class="card">
      <h3>Data Layer</h3>
      <p style="font-size:0.6rem;color:var(--muted);line-height:1.7;margin-bottom:0.75rem;">
        Relational database accessed via JPA repositories. Forms have versioned field definitions. 
        Submissions are stored per version. File uploads are stored and referenced via URL paths. 
        Lookup tables support dynamic dropdown data.
      </p>
      <div class="stack-row">
        <span class="tech-pill">Spring Data JPA</span>
        <span class="tech-pill">Hibernate ORM</span>
        <span class="tech-pill">SQL Database</span>
        <span class="tech-pill">File Storage</span>
      </div>
    </div>
  </div>
</section>

<!-- ── 2. TECH STACK ── -->
<section id="stack">
  <div class="section-header">
    <div class="section-num">02</div>
    <h2>Technology Stack</h2>
  </div>
  <div class="card-grid">
    <div class="card">
      <h3 style="color:var(--accent)">Frontend</h3>
      <div class="sep"></div>
      <div class="mvc-item"><span class="name">Framework</span> Next.js 14 (App Router)</div>
      <div class="mvc-item"><span class="name">UI Library</span> React 18 (Client/Server)</div>
      <div class="mvc-item"><span class="name">HTTP Client</span> Axios with interceptors</div>
      <div class="mvc-item"><span class="name">State</span> React Context (Auth, Forms, Confirm)</div>
      <div class="mvc-item"><span class="name">Icons</span> Lucide React</div>
      <div class="mvc-item"><span class="name">Notifications</span> React Hot Toast</div>
      <div class="mvc-item"><span class="name">Routing</span> Next.js App Router</div>
      <div class="mvc-item"><span class="name">Forms Logic</span> Custom evaluateFormula, evaluateConditions</div>
    </div>
    <div class="card">
      <h3 style="color:var(--accent2)">Backend (Inferred)</h3>
      <div class="sep"></div>
      <div class="mvc-item"><span class="name">Framework</span> Spring Boot</div>
      <div class="mvc-item"><span class="name">Security</span> Spring Security (Session + CSRF)</div>
      <div class="mvc-item"><span class="name">ORM</span> Spring Data JPA + Hibernate</div>
      <div class="mvc-item"><span class="name">Auth Method</span> HTTP Session (cookie-based)</div>
      <div class="mvc-item"><span class="name">CSRF</span> XSRF-TOKEN cookie → X-XSRF-TOKEN header</div>
      <div class="mvc-item"><span class="name">API Style</span> REST · JSON responses</div>
      <div class="mvc-item"><span class="name">File Handling</span> Multipart upload</div>
      <div class="mvc-item"><span class="name">Versioning</span> /api/v1 prefix</div>
    </div>
    <div class="card">
      <h3 style="color:var(--accent3)">Key Constants & Config</h3>
      <div class="sep"></div>
      <div class="mvc-item"><span class="name">API Host</span> NEXT_PUBLIC_API_URL (default: localhost:9090)</div>
      <div class="mvc-item"><span class="name">API Prefix</span> /api/v1</div>
      <div class="mvc-item"><span class="name">Cookie</span> XSRF-TOKEN (SameSite)</div>
      <div class="mvc-item"><span class="name">Session</span> HTTP-only session cookie</div>
      <div class="mvc-item"><span class="name">Pagination</span> 0-indexed (page-1 sent to backend)</div>
      <div class="mvc-item"><span class="name">Sort Default</span> createdAt desc</div>
      <div class="mvc-item"><span class="name">CORS</span> withCredentials: true</div>
    </div>
  </div>
</section>

<!-- ── 3. DATA FLOW ── -->
<section id="dataflow">
  <div class="section-header">
    <div class="section-num">03</div>
    <h2>Data Flow Through the System</h2>
  </div>

  <div style="display:grid;gap:1.5rem;">

    <!-- Auth Flow -->
    <div class="card">
      <h3>🔐 Authentication Flow</h3>
      <div class="flow">
        <div class="flow-node accent">User → /login</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">POST /auth/login<br>{username, password}</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">Spring Security validates</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Session Cookie set<br>+ XSRF-TOKEN cookie</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">AuthContext.setUser()</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">GET /menu → Sidebar built</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">Redirect /dashboard</div>
      </div>
      <p style="font-size:0.6rem;color:var(--muted);margin-top:0.5rem;line-height:1.6;">
        On page refresh, <code>GET /auth/me</code> silently restores session. If session expired, 
        axios 401 interceptor redirects to <code>/login?redirect=&lt;path&gt;</code>.
      </p>
    </div>

    <!-- Form Creation Flow -->
    <div class="card">
      <h3>📝 Form Creation & Publish Flow</h3>
      <div class="flow">
        <div class="flow-node accent">POST /forms</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Form created (DRAFT)</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">POST /forms/{id}/versions</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Version created</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent4">Builder: drag fields</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">POST /forms/{id}/draft (save fields)</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">POST /forms/{id}/publish</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Form PUBLISHED · accessible via /f/{code}</div>
      </div>
    </div>

    <!-- Form Fill Flow -->
    <div class="card">
      <h3>📋 Public Form Fill Flow</h3>
      <div class="flow">
        <div class="flow-node">User visits /f/{code}</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent">GET /runtime/forms/{code}</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Load fields + check visibility</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">If login required → AuthGuard</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Fill form (conditions evaluated client-side)</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">POST /runtime/forms/{code}/submissions/submit</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">Success screen</div>
      </div>
      <p style="font-size:0.6rem;color:var(--muted);margin-top:0.5rem;line-height:1.6;">
        Draft auto-save: <code>POST /runtime/forms/{code}/submissions/draft</code> · 
        Resume: <code>GET /runtime/forms/{code}/submissions/draft</code>
      </p>
    </div>

    <!-- Permission Check Flow -->
    <div class="card">
      <h3>🛡️ Permission / Access Request Flow</h3>
      <div class="flow">
        <div class="flow-node">User needs form access</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent">POST /requests {formId, type, reason}</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Request PENDING</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">Admin sees /requests page</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent4">POST /requests/{id}/process?status=APPROVED&role=VIEWER</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">Permission record created</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">User can now access form</div>
      </div>
    </div>

  </div>
</section>

<!-- ── 4. MVC PATTERN ── -->
<section id="mvc">
  <div class="section-header">
    <div class="section-num">04</div>
    <h2>MVC Architecture (Frontend)</h2>
  </div>

  <div class="mvc-grid" style="margin-bottom:1.5rem;">
    <div class="mvc-col">
      <div class="mvc-col-head" style="color:var(--accent)">Model (State & Context)</div>
      <div class="mvc-item"><span class="name">AuthContext</span> user, isAuthenticated, menuTree, menuFlat</div>
      <div class="mvc-item"><span class="name">FormsContext</span> forms list cache</div>
      <div class="mvc-item"><span class="name">ConfirmationContext</span> global modal state</div>
      <div class="mvc-item"><span class="name">Local state</span> useState per page</div>
      <div class="mvc-item"><span class="name">formService.js</span> all API calls, one source of truth</div>
      <div class="mvc-item"><span class="name">constants.js</span> ENDPOINTS, FIELD_TYPES, REGEX</div>
    </div>
    <div class="mvc-col">
      <div class="mvc-col-head" style="color:var(--accent2)">View (Pages & Components)</div>
      <div class="mvc-item"><span class="name">app/login</span> Login page</div>
      <div class="mvc-item"><span class="name">app/dashboard</span> Dashboard</div>
      <div class="mvc-item"><span class="name">app/forms/[formId]/builder</span> Form Builder</div>
      <div class="mvc-item"><span class="name">app/forms/[formId]/view</span> Form Preview</div>
      <div class="mvc-item"><span class="name">app/f/[code]</span> Public Form Fill</div>
      <div class="mvc-item"><span class="name">app/forms/[formId]/submissions</span> Submissions list</div>
      <div class="mvc-item"><span class="name">app/admin/users</span> User Management</div>
      <div class="mvc-item"><span class="name">app/admin/roles</span> Role Management</div>
      <div class="mvc-item"><span class="name">app/admin/modules</span> Module Management</div>
      <div class="mvc-item"><span class="name">app/requests</span> Access Requests</div>
      <div class="mvc-item"><span class="name">components/layout/Sidebar</span> Dynamic menu</div>
    </div>
    <div class="mvc-col">
      <div class="mvc-col-head" style="color:var(--accent3)">Controller (Hooks & Guards)</div>
      <div class="mvc-item"><span class="name">AuthGuard</span> Redirects unauthenticated to /login</div>
      <div class="mvc-item"><span class="name">useAdminGuard</span> Redirects non-admins to /</div>
      <div class="mvc-item"><span class="name">useAuth()</span> Expose user, login, logout, hasModule</div>
      <div class="mvc-item"><span class="name">hasModule(name)</span> Permission check for UI elements</div>
      <div class="mvc-item"><span class="name">axios interceptors</span> CSRF inject, 401 redirect, unwrap</div>
      <div class="mvc-item"><span class="name">evaluateConditions()</span> Field show/hide/enable logic</div>
      <div class="mvc-item"><span class="name">evaluateFormula()</span> Computed field values</div>
      <div class="mvc-item"><span class="name">validation.js</span> Client-side field validation</div>
    </div>
  </div>

  <div class="card">
    <h3>Backend MVC (Inferred from API structure)</h3>
    <div class="mvc-grid" style="border:none;background:none;gap:1rem;">
      <div style="padding:0;">
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:0.5rem;">Controllers</div>
        <div class="mvc-item"><span class="name">AuthController</span> /auth/**</div>
        <div class="mvc-item"><span class="name">FormController</span> /forms/**</div>
        <div class="mvc-item"><span class="name">RuntimeController</span> /runtime/forms/**</div>
        <div class="mvc-item"><span class="name">SubmissionController</span> /forms/{id}/submissions/**</div>
        <div class="mvc-item"><span class="name">AdminController</span> /admin/**</div>
        <div class="mvc-item"><span class="name">RoleController</span> /roles/**</div>
        <div class="mvc-item"><span class="name">ModuleController</span> /modules/**</div>
        <div class="mvc-item"><span class="name">RequestController</span> /requests/**</div>
        <div class="mvc-item"><span class="name">DashboardController</span> /dashboard/**</div>
        <div class="mvc-item"><span class="name">MenuController</span> /menu</div>
      </div>
      <div style="padding:0;">
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent2);margin-bottom:0.5rem;">Services</div>
        <div class="mvc-item"><span class="name">AuthService</span> Login, register, session mgmt</div>
        <div class="mvc-item"><span class="name">FormService</span> CRUD, versioning, publish, archive</div>
        <div class="mvc-item"><span class="name">SubmissionService</span> Save, export, delete</div>
        <div class="mvc-item"><span class="name">RuntimeService</span> Public form access, draft, submit</div>
        <div class="mvc-item"><span class="name">PermissionService</span> Form-level access grants</div>
        <div class="mvc-item"><span class="name">UserService</span> Admin user management</div>
        <div class="mvc-item"><span class="name">RoleService</span> Role CRUD, module assignment</div>
        <div class="mvc-item"><span class="name">ModuleService</span> Module CRUD</div>
        <div class="mvc-item"><span class="name">RequestService</span> Access request lifecycle</div>
        <div class="mvc-item"><span class="name">MenuService</span> Dynamic menu per user role</div>
      </div>
      <div style="padding:0;">
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent3);margin-bottom:0.5rem;">Repositories (JPA)</div>
        <div class="mvc-item"><span class="name">UserRepository</span></div>
        <div class="mvc-item"><span class="name">FormRepository</span></div>
        <div class="mvc-item"><span class="name">FormVersionRepository</span></div>
        <div class="mvc-item"><span class="name">FormFieldRepository</span></div>
        <div class="mvc-item"><span class="name">SubmissionRepository</span></div>
        <div class="mvc-item"><span class="name">FormPermissionRepository</span></div>
        <div class="mvc-item"><span class="name">RoleRepository</span></div>
        <div class="mvc-item"><span class="name">ModuleRepository</span></div>
        <div class="mvc-item"><span class="name">AccessRequestRepository</span></div>
        <div class="mvc-item"><span class="name">ValidationRepository</span></div>
      </div>
    </div>
  </div>
</section>

<!-- ── 5. API ENDPOINTS ── -->
<section id="endpoints">
  <div class="section-header">
    <div class="section-num">05</div>
    <h2>All API Endpoints — /api/v1</h2>
  </div>
  <p style="font-size:0.62rem;color:var(--muted);margin-bottom:1.5rem;">
    Response envelope: <code style="color:var(--accent)">{success, message, data, errors, meta}</code> · 
    Access levels: <span class="access-pub">PUBLIC</span> = no auth · <span class="access-auth">AUTH</span> = logged-in · <span class="access-admin">ADMIN</span> = ROLE_SYSTEM_ADMIN/ROLE_ADMIN · <span class="access-owner">OWNER/PERM</span> = form owner or granted permission
  </p>

  <!-- AUTH -->
  <div class="ep-group">
    <div class="ep-group-title">Authentication</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/auth/register</td>
        <td style="color:var(--muted)">{username, password}</td>
        <td style="color:var(--muted)">User object</td>
        <td><span class="ep-access access-pub">PUBLIC</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/auth/login</td>
        <td style="color:var(--muted)">{username, password}</td>
        <td style="color:var(--muted)">User + roles + customRoleId</td>
        <td><span class="ep-access access-pub">PUBLIC</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/auth/logout</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Clears session</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/auth/me</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Current user profile + roles</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
    </table>
  </div>

  <!-- FORMS -->
  <div class="ep-group">
    <div class="ep-group-title">Forms (Builder / Admin)</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms</td>
        <td style="color:var(--muted)">?page,size,sortBy,sortDir</td>
        <td style="color:var(--muted)">Paginated form list + meta</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms</td>
        <td style="color:var(--muted)">{name, code, description}</td>
        <td style="color:var(--muted)">Created form</td>
        <td><span class="ep-access access-owner">PERM: canCreateForm</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/published-list</td>
        <td style="color:var(--muted)">?excludeFormId</td>
        <td style="color:var(--muted)">Published forms list</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/lookup</td>
        <td style="color:var(--muted)">?table,valueColumn,labelColumn</td>
        <td style="color:var(--muted)">Lookup data for dropdowns</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/upload</td>
        <td style="color:var(--muted)">multipart/form-data (file)</td>
        <td style="color:var(--muted)">File URL</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Form detail</td>
        <td><span class="ep-access access-owner">OWNER/PERM</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/code/{code}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Form by slug code</td>
        <td><span class="ep-access access-owner">OWNER/PERM</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/draft</td>
        <td style="color:var(--muted)">[field objects]</td>
        <td style="color:var(--muted)">Saved draft</td>
        <td><span class="ep-access access-owner">OWNER + canEditForm</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/publish</td>
        <td style="color:var(--muted)">{fields} or null</td>
        <td style="color:var(--muted)">Published form</td>
        <td><span class="ep-access access-owner">OWNER + canEditForm</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/archive</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Archived form</td>
        <td><span class="ep-access access-owner">OWNER + canArchiveForm</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/reactivate</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Restored form</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/visibility</td>
        <td style="color:var(--muted)">?visibility=PUBLIC|PRIVATE|LOGIN_REQUIRED</td>
        <td style="color:var(--muted)">Updated form</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/fields/reorder</td>
        <td style="color:var(--muted)">{fieldIds}</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-owner">OWNER + canEditForm</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}/validations</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Custom validation rules</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/validations</td>
        <td style="color:var(--muted)">[validation objects]</td>
        <td style="color:var(--muted)">Saved validations</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
    </table>
  </div>

  <!-- VERSIONS -->
  <div class="ep-group">
    <div class="ep-group-title">Form Versions</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{formId}/versions</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">All versions for form</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{formId}/versions</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">New version</td>
        <td><span class="ep-access access-owner">OWNER + canEditForm</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{formId}/versions/{versionId}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Version detail + fields</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{formId}/versions/{versionId}/activate</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Sets version as active</td>
        <td><span class="ep-access access-owner">OWNER + canEditForm</span></td>
      </tr>
    </table>
  </div>

  <!-- SUBMISSIONS -->
  <div class="ep-group">
    <div class="ep-group-title">Submissions</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}/submissions</td>
        <td style="color:var(--muted)">?page,size,search,sort,versionId,showDeleted</td>
        <td style="color:var(--muted)">Paginated submissions</td>
        <td><span class="ep-access access-owner">OWNER + canViewSubmissions</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}/submissions/{subId}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Submission detail</td>
        <td><span class="ep-access access-owner">OWNER + canViewSubmissions</span></td>
      </tr>
      <tr>
        <td><span class="method DELETE">DELETE</span></td>
        <td class="ep-path">/forms/{id}/submissions/{subId}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-owner">OWNER + canDeleteSubmissions</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/submissions/bulk-delete</td>
        <td style="color:var(--muted)">[submissionId, ...]</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-owner">OWNER + canDeleteSubmissions</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/submissions/{subId}/restore</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Restored submission</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/submissions/bulk-restore</td>
        <td style="color:var(--muted)">[submissionId, ...]</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}/submissions/export</td>
        <td style="color:var(--muted)">?search,format=csv|xlsx,versionId</td>
        <td style="color:var(--muted)">File blob (CSV or XLSX)</td>
        <td><span class="ep-access access-owner">OWNER + canViewSubmissions</span></td>
      </tr>
    </table>
  </div>

  <!-- RUNTIME -->
  <div class="ep-group">
    <div class="ep-group-title">Runtime (Public Form Fill) — /runtime</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/runtime/forms/{code}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Form + active fields (respects visibility)</td>
        <td><span class="ep-access access-pub">PUBLIC / AUTH (per visibility)</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/runtime/forms/{code}/submissions/submit</td>
        <td style="color:var(--muted)">{values, formVersionId}</td>
        <td style="color:var(--muted)">Submission confirmation</td>
        <td><span class="ep-access access-pub">PUBLIC / AUTH (per visibility)</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/runtime/forms/{code}/submissions/draft</td>
        <td style="color:var(--muted)">{formVersionId, data}</td>
        <td style="color:var(--muted)">Draft saved</td>
        <td><span class="ep-access access-auth">AUTH (session-linked)</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/runtime/forms/{code}/submissions/draft</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Saved draft for current user</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
    </table>
  </div>

  <!-- PERMISSIONS -->
  <div class="ep-group">
    <div class="ep-group-title">Form Permissions</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/forms/{id}/permissions</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">List of permission grants</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/forms/{id}/permissions</td>
        <td style="color:var(--muted)">?username=&role=VIEWER|EDITOR</td>
        <td style="color:var(--muted)">Created permission</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
      <tr>
        <td><span class="method DELETE">DELETE</span></td>
        <td class="ep-path">/forms/{id}/permissions/{permId}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-owner">OWNER</span></td>
      </tr>
    </table>
  </div>

  <!-- ACCESS REQUESTS -->
  <div class="ep-group">
    <div class="ep-group-title">Access Requests</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/requests</td>
        <td style="color:var(--muted)">{formId, type, reason}</td>
        <td style="color:var(--muted)">Created request</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/requests/my</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Current user's requests</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/requests/pending</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">All pending requests</td>
        <td><span class="ep-access access-admin">ADMIN / module-gated</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/requests/{id}/process</td>
        <td style="color:var(--muted)">?status=APPROVED|REJECTED&role=VIEWER|EDITOR</td>
        <td style="color:var(--muted)">Processed request</td>
        <td><span class="ep-access access-admin">ADMIN / module-gated</span></td>
      </tr>
    </table>
  </div>

  <!-- ADMIN -->
  <div class="ep-group">
    <div class="ep-group-title">Admin — Users, Roles, Modules</div>
    <table>
      <tr><th>Method</th><th>Endpoint</th><th>Body / Params</th><th>Response data</th><th>Access</th></tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/admin/users</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">All users + role info</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/admin/users/{userId}/custom-role</td>
        <td style="color:var(--muted)">?roleId=</td>
        <td style="color:var(--muted)">Updated user</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/admin/users/{userId}/enable</td>
        <td style="color:var(--muted)">?enabled=true|false</td>
        <td style="color:var(--muted)">Updated user</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/roles</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">All custom roles</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/roles</td>
        <td style="color:var(--muted)">{roleName, description, can*}</td>
        <td style="color:var(--muted)">Created role</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method PUT">PUT</span></td>
        <td class="ep-path">/roles/{id}</td>
        <td style="color:var(--muted)">{roleName, description, can*}</td>
        <td style="color:var(--muted)">Updated role</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method DELETE">DELETE</span></td>
        <td class="ep-path">/roles/{id}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/roles/{roleId}/modules</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Module IDs assigned to role</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/roles/{roleId}/modules</td>
        <td style="color:var(--muted)">{moduleIds}</td>
        <td style="color:var(--muted)">Updated assignments</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/modules</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">All modules</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method POST">POST</span></td>
        <td class="ep-path">/modules</td>
        <td style="color:var(--muted)">{name, path, icon, parentId, order}</td>
        <td style="color:var(--muted)">Created module</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method PUT">PUT</span></td>
        <td class="ep-path">/modules/{id}</td>
        <td style="color:var(--muted)">{name, path, icon, ...}</td>
        <td style="color:var(--muted)">Updated module</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method DELETE">DELETE</span></td>
        <td class="ep-path">/modules/{id}</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">—</td>
        <td><span class="ep-access access-admin">SYSTEM_ADMIN</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/menu</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Hierarchical menu tree for current user</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
      <tr>
        <td><span class="method GET">GET</span></td>
        <td class="ep-path">/dashboard/stats</td>
        <td style="color:var(--muted)">—</td>
        <td style="color:var(--muted)">Forms count, submissions, recent activity</td>
        <td><span class="ep-access access-auth">AUTH</span></td>
      </tr>
    </table>
  </div>
</section>

<!-- ── 6. DATABASE ENTITIES ── -->
<section id="entities">
  <div class="section-header">
    <div class="section-num">06</div>
    <h2>Database Entity Design</h2>
  </div>
  <p style="font-size:0.6rem;color:var(--muted);margin-bottom:1.5rem;">
    Legend: <span style="color:var(--accent6)">PK</span> = primary key · <span style="color:var(--accent4)">FK</span> = foreign key · <span style="color:var(--accent3)">IDX</span> = indexed/unique
  </p>

  <div class="entity-grid">

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent)">users</div>
        <span class="tag" style="background:rgba(56,189,248,0.1);color:var(--accent)">CORE</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">username</span><span class="field-type">VARCHAR(50)</span><span class="field-idx">UNIQUE</span></div>
        <div class="field-row"><span class="field-name">password</span><span class="field-type">VARCHAR (hashed)</span></div>
        <div class="field-row"><span class="field-name">enabled</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">roles</span><span class="field-type">Set&lt;String&gt;</span></div>
        <div class="field-row"><span class="field-name">custom_role_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → custom_roles</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent2)">forms</div>
        <span class="tag" style="background:rgba(129,140,248,0.1);color:var(--accent2)">CORE</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">name</span><span class="field-type">VARCHAR(150)</span></div>
        <div class="field-row"><span class="field-name">code</span><span class="field-type">VARCHAR</span><span class="field-idx">UNIQUE</span></div>
        <div class="field-row"><span class="field-name">description</span><span class="field-type">TEXT</span></div>
        <div class="field-row"><span class="field-name">status</span><span class="field-type">ENUM: DRAFT|PUBLISHED|ARCHIVED</span></div>
        <div class="field-row"><span class="field-name">visibility</span><span class="field-type">ENUM: PUBLIC|PRIVATE|LOGIN_REQUIRED</span></div>
        <div class="field-row"><span class="field-name">owner_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users</span></div>
        <div class="field-row"><span class="field-name">active_version_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → form_versions</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
        <div class="field-row"><span class="field-name">updated_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent3)">form_versions</div>
        <span class="tag" style="background:rgba(52,211,153,0.1);color:var(--accent3)">VERSIONING</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → forms</span></div>
        <div class="field-row"><span class="field-name">version_number</span><span class="field-type">INT</span></div>
        <div class="field-row"><span class="field-name">status</span><span class="field-type">ENUM: DRAFT|ACTIVE|INACTIVE</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
        <div class="field-row"><span class="field-name">published_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent4)">form_fields</div>
        <span class="tag" style="background:rgba(251,146,60,0.1);color:var(--accent4)">SCHEMA</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_version_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → form_versions</span></div>
        <div class="field-row"><span class="field-name">field_key</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">label</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">field_type</span><span class="field-type">VARCHAR (ENUM)</span></div>
        <div class="field-row"><span class="field-name">required</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">options</span><span class="field-type">JSON (for dropdowns etc)</span></div>
        <div class="field-row"><span class="field-name">conditions</span><span class="field-type">JSON (visibility/enable rules)</span></div>
        <div class="field-row"><span class="field-name">validations</span><span class="field-type">JSON (min/max/pattern)</span></div>
        <div class="field-row"><span class="field-name">formula</span><span class="field-type">TEXT (computed fields)</span></div>
        <div class="field-row"><span class="field-name">order_index</span><span class="field-type">INT</span></div>
        <div class="field-row"><span class="field-name">parent_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → form_fields (groups)</span></div>
        <div class="field-row"><span class="field-name">lookup_table</span><span class="field-type">VARCHAR (for LOOKUP_DROPDOWN)</span></div>
        <div class="field-row"><span class="field-name">lookup_value_col</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">lookup_label_col</span><span class="field-type">VARCHAR</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent5)">submissions</div>
        <span class="tag" style="background:rgba(244,114,182,0.1);color:var(--accent5)">DATA</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → forms</span></div>
        <div class="field-row"><span class="field-name">form_version_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → form_versions</span></div>
        <div class="field-row"><span class="field-name">submitted_by</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users (nullable)</span></div>
        <div class="field-row"><span class="field-name">values</span><span class="field-type">JSON (field_key → value)</span></div>
        <div class="field-row"><span class="field-name">status</span><span class="field-type">ENUM: SUBMITTED|DRAFT|DELETED</span></div>
        <div class="field-row"><span class="field-name">submitted_at</span><span class="field-type">TIMESTAMP</span></div>
        <div class="field-row"><span class="field-name">deleted_at</span><span class="field-type">TIMESTAMP (soft delete)</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent6)">form_permissions</div>
        <span class="tag" style="background:rgba(250,204,21,0.1);color:var(--accent6)">ACCESS</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → forms</span></div>
        <div class="field-row"><span class="field-name">user_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users</span></div>
        <div class="field-row"><span class="field-name">role</span><span class="field-type">ENUM: VIEWER|EDITOR</span></div>
        <div class="field-row"><span class="field-name">granted_at</span><span class="field-type">TIMESTAMP</span></div>
        <div class="field-row"><span class="field-name">granted_by</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--danger)">access_requests</div>
        <span class="tag" style="background:rgba(248,113,113,0.1);color:var(--danger)">WORKFLOW</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → forms</span></div>
        <div class="field-row"><span class="field-name">requester_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users</span></div>
        <div class="field-row"><span class="field-name">type</span><span class="field-type">ENUM: VIEW|EDIT</span></div>
        <div class="field-row"><span class="field-name">reason</span><span class="field-type">TEXT</span></div>
        <div class="field-row"><span class="field-name">status</span><span class="field-type">ENUM: PENDING|APPROVED|REJECTED</span></div>
        <div class="field-row"><span class="field-name">processed_by</span><span class="field-type">BIGINT</span><span class="field-fk">FK → users (nullable)</span></div>
        <div class="field-row"><span class="field-name">processed_at</span><span class="field-type">TIMESTAMP</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent2)">custom_roles</div>
        <span class="tag" style="background:rgba(129,140,248,0.1);color:var(--accent2)">RBAC</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">role_name</span><span class="field-type">VARCHAR(80)</span><span class="field-idx">UNIQUE</span></div>
        <div class="field-row"><span class="field-name">description</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">can_create_form</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">can_edit_form</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">can_delete_form</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">can_archive_form</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">can_view_submissions</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">can_delete_submissions</span><span class="field-type">BOOLEAN</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent3)">modules</div>
        <span class="tag" style="background:rgba(52,211,153,0.1);color:var(--accent3)">MENU</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">module_name</span><span class="field-type">VARCHAR</span><span class="field-idx">UNIQUE</span></div>
        <div class="field-row"><span class="field-name">path</span><span class="field-type">VARCHAR (route path)</span></div>
        <div class="field-row"><span class="field-name">icon</span><span class="field-type">VARCHAR (icon id string)</span></div>
        <div class="field-row"><span class="field-name">parent_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → modules (self)</span></div>
        <div class="field-row"><span class="field-name">order_index</span><span class="field-type">INT</span></div>
        <div class="field-row"><span class="field-name">is_system</span><span class="field-type">BOOLEAN (protected)</span></div>
        <div class="field-row"><span class="field-name">created_at</span><span class="field-type">TIMESTAMP</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--accent4)">role_modules</div>
        <span class="tag" style="background:rgba(251,146,60,0.1);color:var(--accent4)">JOIN</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">role_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → custom_roles</span></div>
        <div class="field-row"><span class="field-name">module_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → modules</span></div>
        <div class="field-row"><span class="field-name">(PK)</span><span class="field-type">composite (role_id, module_id)</span><span class="field-pk">PK</span></div>
      </div>
    </div>

    <div class="entity">
      <div class="entity-head">
        <div class="entity-name" style="color:var(--muted)">form_validations</div>
        <span class="tag" style="background:rgba(100,116,139,0.1);color:var(--muted)">LOGIC</span>
      </div>
      <div class="entity-fields">
        <div class="field-row"><span class="field-name">id</span><span class="field-type">BIGINT</span><span class="field-pk">PK</span></div>
        <div class="field-row"><span class="field-name">form_id</span><span class="field-type">BIGINT</span><span class="field-fk">FK → forms</span></div>
        <div class="field-row"><span class="field-name">name</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">expression</span><span class="field-type">TEXT (JS expression)</span></div>
        <div class="field-row"><span class="field-name">error_message</span><span class="field-type">VARCHAR</span></div>
        <div class="field-row"><span class="field-name">enabled</span><span class="field-type">BOOLEAN</span></div>
      </div>
    </div>

  </div>

  <div class="card" style="margin-top:1.5rem;">
    <h3>Entity Relationships</h3>
    <div style="font-size:0.62rem;color:var(--muted);line-height:2;column-count:2;column-gap:2rem;">
      <div>users <span style="color:var(--border2)">─── 1:N ───</span> forms (owner)</div>
      <div>users <span style="color:var(--border2)">─── N:1 ───</span> custom_roles (assigned role)</div>
      <div>forms <span style="color:var(--border2)">─── 1:N ───</span> form_versions</div>
      <div>forms <span style="color:var(--border2)">─── 1:1 ───</span> form_versions (active_version)</div>
      <div>form_versions <span style="color:var(--border2)">─── 1:N ───</span> form_fields</div>
      <div>form_fields <span style="color:var(--border2)">─── 1:N ───</span> form_fields (parent, for groups)</div>
      <div>forms <span style="color:var(--border2)">─── 1:N ───</span> submissions</div>
      <div>form_versions <span style="color:var(--border2)">─── 1:N ───</span> submissions</div>
      <div>forms <span style="color:var(--border2)">─── 1:N ───</span> form_permissions</div>
      <div>users <span style="color:var(--border2)">─── 1:N ───</span> form_permissions</div>
      <div>forms <span style="color:var(--border2)">─── 1:N ───</span> access_requests</div>
      <div>custom_roles <span style="color:var(--border2)">─── N:N ───</span> modules (via role_modules)</div>
      <div>modules <span style="color:var(--border2)">─── 1:N ───</span> modules (parent/child tree)</div>
      <div>forms <span style="color:var(--border2)">─── 1:N ───</span> form_validations</div>
    </div>
  </div>
</section>

<!-- ── 7. SECURITY ── -->
<section id="security">
  <div class="section-header">
    <div class="section-num">07</div>
    <h2>Security Architecture</h2>
  </div>

  <div class="sec-grid">

    <div class="sec-card">
      <div class="sec-icon">🔐</div>
      <h3>Session Authentication</h3>
      <div class="sec-list">
        <div class="sec-item">HTTP Session via server-side session management (Spring Security)</div>
        <div class="sec-item">Session cookie is HTTP-only, not accessible from JavaScript</div>
        <div class="sec-item"><code>withCredentials: true</code> on all Axios requests to include cookies cross-origin</div>
        <div class="sec-item">Session validated on every request via Spring Security filter chain</div>
        <div class="sec-item">On 401 response: Axios interceptor auto-redirects to <code>/login?redirect=path</code></div>
        <div class="sec-item">Page load restores session via <code>GET /auth/me</code> in AuthContext useEffect</div>
        <div class="sec-item">Logout clears server session + resets AuthContext state</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">🛡️</div>
      <h3>CSRF Protection</h3>
      <div class="sec-list">
        <div class="sec-item">Server sets <code>XSRF-TOKEN</code> cookie (non-HTTP-only, readable by JS)</div>
        <div class="sec-item">Axios request interceptor reads <code>XSRF-TOKEN</code> from cookie via <code>getCookie()</code></div>
        <div class="sec-item">Token injected as <code>X-XSRF-TOKEN</code> header on every mutating request</div>
        <div class="sec-item">Spring Security verifies XSRF header matches cookie value</div>
        <div class="sec-item">Protects all POST / PUT / DELETE endpoints from cross-site request forgery</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">🚦</div>
      <h3>Route Guards (Frontend)</h3>
      <div class="sec-list">
        <div class="sec-item"><strong>AuthGuard</strong>: wraps all authenticated pages — redirects to /login if not authenticated</div>
        <div class="sec-item"><strong>useAdminGuard</strong>: checks <code>user.roles</code> for ROLE_SYSTEM_ADMIN or ROLE_ADMIN — redirects to / if not admin</div>
        <div class="sec-item">Auth state is loading-aware: shows spinner until session is resolved before any redirect</div>
        <div class="sec-item">Non-admin users trying to navigate to /admin/* are immediately redirected</div>
        <div class="sec-item">Module-level access controlled via <code>hasModule(moduleName)</code> which checks menuFlat</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">🔑</div>
      <h3>Role-Based Access Control</h3>
      <div class="sec-list">
        <div class="sec-item"><strong>ROLE_SYSTEM_ADMIN</strong> (or ROLE_ADMIN): full platform admin — users, roles, modules</div>
        <div class="sec-item"><strong>Custom Roles</strong>: fine-grained boolean permission flags assigned by admin</div>
        <div class="sec-item">System-admin-only modules are blocked from role assignment (RESTRICTED_MODULES list)</div>
        <div class="sec-item">Backend enforces role checks at controller level (Spring Security @PreAuthorize or manual checks)</div>
        <div class="sec-item">Frontend uses <code>hasModule()</code> to conditionally render UI elements (buttons, nav items)</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">🗂️</div>
      <h3>Form-Level Permissions</h3>
      <div class="sec-list">
        <div class="sec-item">Form owner has full control over their forms</div>
        <div class="sec-item">Others need explicit permission grants: VIEWER or EDITOR role on a form</div>
        <div class="sec-item">Permissions granted via access request workflow or directly by owner</div>
        <div class="sec-item">Form visibility controls public access: PUBLIC | PRIVATE | LOGIN_REQUIRED</div>
        <div class="sec-item">Backend checks permission for every form-scoped endpoint</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">✅</div>
      <h3>Input Validation</h3>
      <div class="sec-list">
        <div class="sec-item">Client-side validation in <code>validation.js</code> with regex patterns (USERNAME, EMAIL, SLUG, ROLE_NAME)</div>
        <div class="sec-item">Password: min 6 chars, must contain letter + number</div>
        <div class="sec-item">Username: 3–50 chars, alphanumeric + underscore only</div>
        <div class="sec-item">Form name: 3–150 chars, allows word chars + punctuation</div>
        <div class="sec-item">Role name: uppercase alphanumeric + underscore, 2–80 chars</div>
        <div class="sec-item">Backend mirrors same validation rules (prevents client bypass)</div>
        <div class="sec-item">Server error messages surfaced via <code>formatServerErrors()</code></div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">🔒</div>
      <h3>Account Security</h3>
      <div class="sec-list">
        <div class="sec-item">User accounts can be enabled/disabled by System Admin</div>
        <div class="sec-item">Disabled users cannot authenticate (Spring Security: enabled flag)</div>
        <div class="sec-item">Passwords are hashed server-side (Spring Security BCrypt)</div>
        <div class="sec-item">No password reset flow visible in current codebase</div>
      </div>
    </div>

    <div class="sec-card">
      <div class="sec-icon">📋</div>
      <h3>Module System Restriction</h3>
      <div class="sec-list">
        <div class="sec-item">Certain modules are "restricted" and cannot be assigned to custom roles</div>
        <div class="sec-item">Restricted: System Admin, Module Management, Role Management, User Management, All Access Requests</div>
        <div class="sec-item">These modules are SYSTEM_ADMIN exclusive regardless of role config</div>
        <div class="sec-item">Enforced both in frontend UI (filtered out) and backend</div>
      </div>
    </div>

  </div>
</section>

<!-- ── 8. ROLES & PERMISSIONS ── -->
<section id="roles">
  <div class="section-header">
    <div class="section-num">08</div>
    <h2>Roles & Permissions Matrix</h2>
  </div>

  <div class="role-grid">

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--accent5)"></div>
        <div class="role-title">ROLE_SYSTEM_ADMIN</div>
        <span class="tag" style="background:rgba(244,114,182,0.1);color:var(--accent5);margin-left:auto">BUILT-IN</span>
      </div>
      <div class="role-desc">Platform super-administrator. Has unrestricted access to all system functions. Assigned at registration/bootstrap.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check on">✓</span> Full user management (list, enable/disable, assign roles)</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Full role CRUD + module assignment</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Full module CRUD (create sidebar menu items)</div>
        <div class="perm-item"><span class="perm-check on">✓</span> View + process all pending access requests</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Create, edit, delete, archive any form</div>
        <div class="perm-item"><span class="perm-check on">✓</span> View + delete any submissions</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Access all admin pages (/admin/**)</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Dynamic sidebar shows ALL modules</div>
      </div>
    </div>

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--accent)"></div>
        <div class="role-title">ROLE_ADMIN</div>
        <span class="tag" style="background:rgba(56,189,248,0.1);color:var(--accent);margin-left:auto">BUILT-IN</span>
      </div>
      <div class="role-desc">Alias for SYSTEM_ADMIN in current codebase. The <code>useAdminGuard</code> and admin pages check for either ROLE_SYSTEM_ADMIN or ROLE_ADMIN.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check on">✓</span> Same as ROLE_SYSTEM_ADMIN (treated identically in UI guards)</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Access /admin/** pages</div>
        <div class="perm-item"><span class="perm-check on">✓</span> User, role, module management</div>
      </div>
    </div>

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--accent2)"></div>
        <div class="role-title">Custom Role (e.g. FORM_MANAGER)</div>
        <span class="tag" style="background:rgba(129,140,248,0.1);color:var(--accent2);margin-left:auto">CUSTOM</span>
      </div>
      <div class="role-desc">Admin-defined roles with configurable boolean permission flags. Assigned to users by System Admin. Controls what forms-related actions a user can perform.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check cond">~</span> canCreateForm — create new forms</div>
        <div class="perm-item"><span class="perm-check cond">~</span> canEditForm — edit form builder & fields</div>
        <div class="perm-item"><span class="perm-check cond">~</span> canDeleteForm — delete forms</div>
        <div class="perm-item"><span class="perm-check cond">~</span> canArchiveForm — archive / restore forms</div>
        <div class="perm-item"><span class="perm-check cond">~</span> canViewSubmissions — view submission data</div>
        <div class="perm-item"><span class="perm-check cond">~</span> canDeleteSubmissions — delete submissions</div>
        <div class="perm-item"><span class="perm-check cond">~</span> Module access — determined by which modules the role has assigned</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot access /admin/** pages</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot manage users, roles, modules</div>
      </div>
    </div>

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--accent3)"></div>
        <div class="role-title">Form Permission: VIEWER</div>
        <span class="tag" style="background:rgba(52,211,153,0.1);color:var(--accent3);margin-left:auto">FORM-LEVEL</span>
      </div>
      <div class="role-desc">Per-form permission granted by the form owner (or via access request approval). Scoped to a single form only.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check on">✓</span> View form detail and fields</div>
        <div class="perm-item"><span class="perm-check on">✓</span> View submissions for this form</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Export submissions</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot edit form fields or settings</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot delete submissions or form</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot grant permissions to others</div>
      </div>
    </div>

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--accent4)"></div>
        <div class="role-title">Form Permission: EDITOR</div>
        <span class="tag" style="background:rgba(251,146,60,0.1);color:var(--accent4);margin-left:auto">FORM-LEVEL</span>
      </div>
      <div class="role-desc">Per-form edit permission. Granted by form owner or approved access request with EDITOR role.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check on">✓</span> All VIEWER permissions</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Edit form fields in builder (if canEditForm on custom role)</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Save drafts and publish versions</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot delete the form</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot manage form permissions</div>
      </div>
    </div>

    <div class="role-card">
      <div class="role-head">
        <div class="role-dot" style="background:var(--muted)"></div>
        <div class="role-title">Anonymous / Unauthenticated</div>
        <span class="tag" style="background:rgba(100,116,139,0.1);color:var(--muted);margin-left:auto">PUBLIC</span>
      </div>
      <div class="role-desc">Users who are not logged in. Access is limited to public-facing form fill only, depending on form's visibility setting.</div>
      <div class="perm-list">
        <div class="perm-item"><span class="perm-check on">✓</span> View and fill PUBLIC forms at /f/{code}</div>
        <div class="perm-item"><span class="perm-check on">✓</span> Register a new account</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot access dashboard, admin, or builder</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot access LOGIN_REQUIRED or PRIVATE forms</div>
        <div class="perm-item"><span class="perm-check off">✗</span> Cannot submit drafts (drafts require auth)</div>
      </div>
    </div>

  </div>
</section>

<!-- ── 9. MODULE SYSTEM ── -->
<section id="modules">
  <div class="section-header">
    <div class="section-num">09</div>
    <h2>Dynamic Module / Menu System</h2>
  </div>

  <div class="card" style="margin-bottom:1rem;">
    <h3>How the Module System Works</h3>
    <p style="font-size:0.62rem;color:var(--muted);line-height:1.8;">
      Modules define the sidebar navigation. Each module has a <strong>name</strong>, <strong>path</strong> (route), <strong>icon</strong>, and optional <strong>parent</strong> for nesting. 
      Admins can create/edit/delete modules freely. Custom roles are then assigned a set of module IDs. 
      When a user logs in, <code>GET /menu</code> returns only the modules the user's role grants access to, 
      as a hierarchical tree. The sidebar is built dynamically from this tree — meaning the navigation 
      is entirely database-driven and configurable without code changes.
    </p>
    <div class="flow" style="margin-top:1rem;">
      <div class="flow-node">Admin creates Module in DB</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node accent">Assign Module to Role</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node accent2">Assign Role to User</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node accent3">User logs in → GET /menu</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node">Returns tree of allowed modules</div>
      <div class="flow-arrow">→</div>
      <div class="flow-node accent4">Sidebar rendered dynamically</div>
    </div>
  </div>

  <div class="card-grid-3">
    <div class="card">
      <h3>Module Properties</h3>
      <div class="mvc-item"><span class="name">module_name</span> Display name (also used for hasModule())</div>
      <div class="mvc-item"><span class="name">path</span> Next.js route path</div>
      <div class="mvc-item"><span class="name">icon</span> Icon ID string (maps to Lucide icon)</div>
      <div class="mvc-item"><span class="name">parent_id</span> For nested/grouped menu items</div>
      <div class="mvc-item"><span class="name">order_index</span> Display order</div>
      <div class="mvc-item"><span class="name">is_system</span> Restricted (admin-only) flag</div>
    </div>
    <div class="card">
      <h3>System-Restricted Modules</h3>
      <p style="font-size:0.6rem;color:var(--muted);margin-bottom:0.5rem;">Cannot be assigned to custom roles:</p>
      <div class="mvc-item"><span class="name">System Admin</span> /admin</div>
      <div class="mvc-item"><span class="name">Module Management</span> /admin/modules</div>
      <div class="mvc-item"><span class="name">Role Management</span> /admin/roles</div>
      <div class="mvc-item"><span class="name">User Management</span> /admin/users</div>
      <div class="mvc-item"><span class="name">All Access Requests</span> /requests</div>
    </div>
    <div class="card">
      <h3>hasModule() Usage</h3>
      <p style="font-size:0.6rem;color:var(--muted);margin-bottom:0.5rem;">Pages use this to gate UI elements:</p>
      <pre style="padding:0.5rem;font-size:0.55rem;">const { hasModule } = useAuth();

// Show "New Form" button only if
// user's role grants this module
if (hasModule("Create New Form")) {
  // render create button
}

// Check in sidebar for link visibility
// Checked against flattened menuFlat[]</pre>
    </div>
  </div>
</section>

<!-- ── 10. FORM LIFECYCLE ── -->
<section id="lifecycle">
  <div class="section-header">
    <div class="section-num">10</div>
    <h2>Form Lifecycle & Field Types</h2>
  </div>

  <div class="card" style="margin-bottom:1rem;">
    <h3>Form Status Lifecycle</h3>
    <div class="lifecycle">
      <div class="lc-step" style="border-color:rgba(100,116,139,0.4);color:var(--muted)">DRAFT</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step" style="border-color:rgba(52,211,153,0.4);color:var(--accent3)">PUBLISHED</div>
      <div class="lc-arrow">↔</div>
      <div class="lc-step" style="border-color:rgba(251,146,60,0.4);color:var(--accent4)">ARCHIVED</div>
    </div>
    <div style="font-size:0.6rem;color:var(--muted);line-height:1.8;margin-top:0.5rem;">
      <strong style="color:var(--text)">DRAFT →</strong> Created but not published. Builder accessible. Not fillable publicly. <br>
      <strong style="color:var(--text)">PUBLISHED →</strong> Active and accessible via /f/{code} (subject to visibility). <br>
      <strong style="color:var(--text)">ARCHIVED →</strong> Deactivated. Not accessible publicly. Can be restored to PUBLISHED.
    </div>
  </div>

  <div class="card" style="margin-bottom:1rem;">
    <h3>Version Lifecycle</h3>
    <div class="lifecycle">
      <div class="lc-step">Create Version</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step" style="color:var(--muted)">DRAFT version</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step">Edit fields in Builder</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step" style="color:var(--accent)">POST /draft (save)</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step" style="color:var(--accent3)">POST /publish → ACTIVE</div>
      <div class="lc-arrow">→</div>
      <div class="lc-step" style="color:var(--accent2)">Old version → INACTIVE</div>
    </div>
    <div style="font-size:0.6rem;color:var(--muted);margin-top:0.5rem;">
      Each form can have multiple versions. Only one version is active at a time. Submissions reference the version they were submitted against. Old submissions remain accessible even after version change.
    </div>
  </div>

  <div class="card">
    <h3>Supported Field Types</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;margin-top:0.5rem;">
      <div>
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:0.4rem;">Essential</div>
        <div class="mvc-item"><span class="name">TEXT</span> Short Answer</div>
        <div class="mvc-item"><span class="name">TEXTAREA</span> Paragraph</div>
        <div class="mvc-item"><span class="name">EMAIL</span> Email input</div>
        <div class="mvc-item"><span class="name">INTEGER</span> Number</div>
        <div class="mvc-item"><span class="name">DATE</span> Date picker</div>
        <div class="mvc-item"><span class="name">TIME</span> Time picker</div>
        <div class="mvc-item"><span class="name">DATETIME</span> Date & Time</div>
        <div class="mvc-item"><span class="name">PHONE</span> Phone number</div>
        <div class="mvc-item"><span class="name">BOOLEAN</span> Yes/No Toggle</div>
      </div>
      <div>
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent2);margin-bottom:0.4rem;">Selection & Rating</div>
        <div class="mvc-item"><span class="name">RADIO</span> Multiple Choice</div>
        <div class="mvc-item"><span class="name">CHECKBOX_GROUP</span> Checkboxes</div>
        <div class="mvc-item"><span class="name">DROPDOWN</span> Dropdown</div>
        <div class="mvc-item"><span class="name">STAR_RATING</span> Star Rating</div>
        <div class="mvc-item"><span class="name">LINEAR_SCALE</span> Scale slider</div>
      </div>
      <div>
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent3);margin-bottom:0.4rem;">Advanced</div>
        <div class="mvc-item"><span class="name">FILE_UPLOAD</span> File Upload</div>
        <div class="mvc-item"><span class="name">MC_GRID</span> Multiple Choice Grid</div>
        <div class="mvc-item"><span class="name">TICK_BOX_GRID</span> Tick Box Grid</div>
        <div class="mvc-item"><span class="name">LOOKUP_DROPDOWN</span> DB-linked Dropdown</div>
      </div>
      <div>
        <div style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent4);margin-bottom:0.4rem;">Layout & Logic</div>
        <div class="mvc-item"><span class="name">SECTION</span> Section Break</div>
        <div class="mvc-item"><span class="name">PAGE_BREAK</span> Multi-page forms</div>
        <div class="mvc-item"><span class="name">GROUP</span> Field grouping</div>
        <div class="mvc-item"><span class="name">LABEL</span> Info / label text</div>
      </div>
    </div>
  </div>
</section>

<!-- ── 11. REQUEST/RESPONSE FLOW ── -->
<section id="request-response">
  <div class="section-header">
    <div class="section-num">11</div>
    <h2>Request & Response Flow</h2>
  </div>

  <div style="display:grid;gap:1rem;">

    <div class="card">
      <h3>Standard Request Pipeline</h3>
      <div class="flow">
        <div class="flow-node accent">React Component<br>calls api.someMethod()</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">formService.js<br>calls API.method(url, data)</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">Axios Request Interceptor<br>injects X-XSRF-TOKEN header</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">HTTP Request with<br>session cookie + CSRF header</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent3">Spring Security<br>validates session + CSRF</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent4">Controller<br>checks role/permission</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Service Layer<br>business logic</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent5">JPA Repository<br>DB query</div>
      </div>
    </div>

    <div class="card">
      <h3>Standard Response Pipeline</h3>
      <div class="flow">
        <div class="flow-node accent5">DB Result</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">Service<br>maps to DTO</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent4">Controller<br>wraps in envelope</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node">HTTP Response JSON<br>{success, message, data, errors, meta}</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent2">Axios Response Interceptor<br>unwraps → returns response.data</div>
        <div class="flow-arrow">→</div>
        <div class="flow-node accent">Component receives<br>envelope object<br>.data = payload</div>
      </div>
    </div>

    <div class="card-grid">
      <div class="card">
        <h3>Success Response Shape</h3>
        <pre>{
  <span class="k">"success"</span>: <span class="n">true</span>,
  <span class="k">"message"</span>: <span class="s">"Form created"</span>,
  <span class="k">"data"</span>: {
    <span class="k">"id"</span>: <span class="n">42</span>,
    <span class="k">"name"</span>: <span class="s">"Survey 2025"</span>,
    <span class="k">"code"</span>: <span class="s">"survey-2025"</span>,
    <span class="k">"status"</span>: <span class="s">"DRAFT"</span>
  },
  <span class="k">"errors"</span>: <span class="n">null</span>,
  <span class="k">"meta"</span>: {
    <span class="c">// pagination, if applicable</span>
    <span class="k">"page"</span>: <span class="n">0</span>,
    <span class="k">"size"</span>: <span class="n">10</span>,
    <span class="k">"total"</span>: <span class="n">53</span>
  }
}</pre>
      </div>
      <div class="card">
        <h3>Error Response Shape</h3>
        <pre>{
  <span class="k">"success"</span>: <span class="n">false</span>,
  <span class="k">"message"</span>: <span class="s">"Validation failed"</span>,
  <span class="k">"data"</span>: <span class="n">null</span>,
  <span class="k">"errors"</span>: {
    <span class="k">"username"</span>: <span class="s">"Already taken"</span>,
    <span class="k">"password"</span>: <span class="s">"Too short"</span>
  },
  <span class="k">"meta"</span>: <span class="n">null</span>
}

<span class="c">// Error handling in components:</span>
<span class="c">// formatServerErrors(e.response?.data?.errors)</span>
<span class="c">// e.response?.data?.message</span></pre>
      </div>
      <div class="card">
        <h3>Pagination Response Shape</h3>
        <pre>{
  <span class="k">"success"</span>: <span class="n">true</span>,
  <span class="k">"data"</span>: [
    { <span class="k">"id"</span>: <span class="n">1</span>, <span class="k">"name"</span>: <span class="s">"Form A"</span> },
    { <span class="k">"id"</span>: <span class="n">2</span>, <span class="k">"name"</span>: <span class="s">"Form B"</span> }
  ],
  <span class="k">"meta"</span>: {
    <span class="k">"page"</span>: <span class="n">0</span>,    <span class="c">// 0-indexed</span>
    <span class="k">"size"</span>: <span class="n">10</span>,
    <span class="k">"totalElements"</span>: <span class="n">47</span>,
    <span class="k">"totalPages"</span>: <span class="n">5</span>
  }
}

<span class="c">// Frontend sends page-1 (converts</span>
<span class="c">// 1-indexed UI to 0-indexed backend)</span></pre>
      </div>
    </div>

    <div class="card">
      <h3>403 / Unauthorized Behavior</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div>
          <div style="font-size:0.6rem;color:var(--muted);line-height:1.8;">
            <strong style="color:var(--text)">401 Unauthorized:</strong><br>
            Session expired or not authenticated. Axios interceptor catches this automatically 
            (excluding /auth/me and /login page) and redirects to <code>/login?redirect=&lt;currentPath&gt;</code>. 
            The redirect param allows post-login return to the intended page.
          </div>
        </div>
        <div>
          <div style="font-size:0.6rem;color:var(--muted);line-height:1.8;">
            <strong style="color:var(--text)">403 Forbidden:</strong><br>
            Authenticated but insufficient permissions. Pages handle this individually — most show 
            a toast error and call <code>router.replace("/")</code> or <code>router.replace("/dashboard")</code>. 
            Admin pages use <code>useAdminGuard</code> which redirects non-admins before any API call.
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border);text-align:center;">
    <div style="font-size:0.58rem;color:var(--muted);">
      FormCraft System Architecture · Generated from source analysis · 
      <span style="color:var(--border2)">Next.js 14 + Spring Boot + JPA</span>
    </div>
  </div>
</section>
` }} />
        </div>
    );
}
