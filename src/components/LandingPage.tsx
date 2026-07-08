'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DEMO_OUTLETS = [
  'Product Hunt',
  'Hacker News',
  'BetaList',
  'AlternativeTo',
  'SaaSHub',
  'Indie Hackers',
];

const DIRECTORIES = [
  'Product Hunt', 'Show HN', 'Indie Hackers', 'Launched!', 'TechPluto',
  'Tiny Startups', 'Tiny Launch', 'Firsto', '+ more',
];

const CYCLE_TICKS = DEMO_OUTLETS.length + 4; // extra ticks = pause at 100%

function CockpitDemo() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 680);
    return () => clearInterval(id);
  }, []);

  const pos = tick % CYCLE_TICKS;
  const n = Math.min(pos, DEMO_OUTLETS.length);
  const total = DEMO_OUTLETS.length;
  const pct = Math.round((n / total) * 100);

  return (
    <div className="lw-mockup">
      <div className="lw-browser-bar">
        <div className="lw-dots">
          <span className="lw-dot lw-dot-r" />
          <span className="lw-dot lw-dot-y" />
          <span className="lw-dot lw-dot-g" />
        </div>
        <div className="lw-url-bar">listwave.vercel.app</div>
      </div>
      <div className="lw-app-wrap">
        <div className="lw-mini-header">
          <span className="lw-mini-brand brand-ink flex items-center gap-1">
            <Image src="/logo.png" alt="" width={14} height={14} className="rounded" />
            Listwave
          </span>
          <div className="lw-mini-nav">
            <span>Manage outlets</span>
            <span>Sign out</span>
          </div>
        </div>
        <div className="lw-mini-body">
          <div className="lw-proj-row">
            <div className="lw-proj-avatar">M</div>
            <div>
              <div className="lw-proj-name">MySaaS</div>
              <div className="lw-proj-meta">{n} / {total} submitted</div>
            </div>
            <div className="lw-proj-pct brand-ink">{pct}%</div>
          </div>
          <div className="lw-prog-track">
            <div
              className="lw-prog-fill progress-fill"
              style={{ width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
          <div className="lw-outlet-list">
            {DEMO_OUTLETS.map((name, i) => {
              const done = i < n;
              return (
                <div key={name} className={`lw-ol-row${done ? ' lw-ol-done' : ''}`}>
                  <span className="lw-ol-check">{done ? '✓' : '○'}</span>
                  <span className="lw-ol-name">{name}</span>
                  {done
                    ? <span className="lw-ol-badge">Submitted</span>
                    : <span className="lw-ol-open">Open →</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ num, icon, title, desc }: { num: string; icon: string; title: string; desc: string }) {
  return (
    <div className="lw-step panel">
      <div className="lw-step-num">{num}</div>
      <div className="lw-step-icon">{icon}</div>
      <h3 className="lw-step-h">{title}</h3>
      <p className="lw-step-p">{desc}</p>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="lw-feat panel">
      <div className="lw-feat-icon">{icon}</div>
      <h3 className="lw-feat-h">{title}</h3>
      <p className="lw-feat-p">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="lw">
      {/* ── HERO ── */}
      <section className="lw-hero">
        <div className="lw-hero-inner">
          <div className="lw-hero-copy">
            <div className="lw-badge">🚀 Personal launch cockpit</div>
            <h1 className="lw-h1">
              Prep once.<br />
              <span className="lw-animated-grad">Launch everywhere.</span>
            </h1>
            <p className="lw-lead">
              Fill your launch kit once — Listwave maps it to 26+ directories,
              communities, and listing sites. Pre-built copy for each outlet,
              progress tracking, and on-device AI.
            </p>
            <div className="lw-actions">
              <Link href="/login" className="btn-primary lw-cta-btn">
                Get started free →
              </Link>
              <a href="#how" className="lw-ghost">How it works ↓</a>
            </div>
            <div className="lw-trust">
              <span><span className="lw-trust-check">✓</span>Free to use</span>
              <span><span className="lw-trust-check">✓</span>No credit card</span>
            </div>
          </div>
          <div className="lw-hero-demo">
            <CockpitDemo />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="lw-stats">
        <div className="lw-stat">
          <div className="lw-stat-n brand-ink">26+</div>
          <div className="lw-stat-l">launch outlets</div>
        </div>
        <div className="lw-stat-sep" />
        <div className="lw-stat">
          <div className="lw-stat-n brand-ink">1×</div>
          <div className="lw-stat-l">kit to fill</div>
        </div>
        <div className="lw-stat-sep" />
        <div className="lw-stat">
          <div className="lw-stat-n brand-ink">0</div>
          <div className="lw-stat-l">spreadsheets needed</div>
        </div>
        <div className="lw-stat-sep" />
        <div className="lw-stat">
          <div className="lw-stat-n brand-ink">✨</div>
          <div className="lw-stat-l">on-device AI</div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lw-sec">
        <div className="lw-sec-hd">
          <div className="lw-tag">How it works</div>
          <h2 className="lw-h2">Launch in 3 steps</h2>
          <p className="lw-sub">Your kit is prepped once — Listwave handles the rest so you can focus on submitting.</p>
        </div>
        <div className="lw-steps">
          <Step
            num="01" icon="✍️" title="Fill your kit once"
            desc="Name, tagline, descriptions, pricing, screenshots — all in one form. Listwave stores and maps it automatically."
          />
          <Step
            num="02" icon="🗂️" title="Work your outlet list"
            desc="Click 'Open submit page' for each outlet. Your copy is pre-mapped to that site's fields — short, long, or guided. AI rewrites on demand."
          />
          <Step
            num="03" icon="📊" title="Track your launch"
            desc="Mark outlets submitted, skip ones that don't fit. Watch your progress bar climb. See exactly what's left at a glance."
          />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lw-sec">
        <div className="lw-sec-hd">
          <div className="lw-tag">Features</div>
          <h2 className="lw-h2">Everything for launch day</h2>
        </div>
        <div className="lw-feats">
          <Feature
            icon="✨" title="On-device AI rewording"
            desc="WebGPU-powered AI rewrites your copy to be shorter, longer, or in a different tone — privately, right in your browser. No API keys."
          />
          <Feature
            icon="📋" title="Per-outlet copy"
            desc="Each outlet keeps its own copy. Tweak your Product Hunt tagline without touching your HN Show post."
          />
          <Feature
            icon="↕️" title="Drag to prioritize"
            desc="Sort your outlets by importance. Drag Product Hunt to the top, push paid directories down. Your order, your call."
          />
          <Feature
            icon="🔧" title="Customizable list"
            desc="Add, edit, or remove outlets. Your list isn't locked to our curation — make it fit your launch strategy."
          />
        </div>
      </section>

      {/* ── DIRECTORY CHIPS ── */}
      <section className="lw-sec lw-chips-sec">
        <div className="lw-sec-hd">
          <div className="lw-tag">Built-in outlets</div>
          <h2 className="lw-h2">All the places indie hackers launch</h2>
          <p className="lw-sub">Ships with 26 pre-loaded outlets. Add more any time.</p>
        </div>
        <div className="lw-chips">
          {DIRECTORIES.map(d => (
            <span key={d} className="lw-chip">{d}</span>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lw-cta-sec">
        <div className="lw-cta-box panel">
          <h2 className="lw-cta-h">Stop tracking your launch in a spreadsheet.</h2>
          <p className="lw-cta-sub">Set up your launch cockpit in minutes.</p>
          <Link href="/login" className="btn-primary lw-cta-big">
            Start free — no card needed →
          </Link>
          <div className="lw-trust" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            <span><span className="lw-trust-check">✓</span>Free to use</span>
            <span><span className="lw-trust-check">✓</span>No credit card</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lw-footer">
        <span className="brand-ink font-bold flex items-center gap-1.5">
          <Image src="/logo.png" alt="" width={18} height={18} className="rounded-md" />
          Listwave
        </span>
        <span className="lw-fsep">·</span>
        <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Built for indie hackers</span>
      </footer>
    </div>
  );
}
