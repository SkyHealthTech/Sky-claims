'use client';
import { useState } from 'react';
import { Search, FileText, ShieldCheck, Receipt, AlertTriangle, User, CheckCircle2, Settings, LogIn } from 'lucide-react';

type AuditEntry = {
  id: string;
  event: string;
  actor: string;
  actorInitials: string;
  detail: string;
  time: string;
  date: string;
  type: 'claim' | 'eligibility' | 'remittance' | 'auth' | 'settings' | 'patient' | 'error';
};

const EVENTS: AuditEntry[] = [
  { id: 'A-128', event: 'Claim paid',           actor: 'Teleplan (system)', actorInitials: 'TP', detail: 'CLM-1042 · $88.35 · James Burnham',         time: '2m ago',  date: 'Aug 5, 2026', type: 'claim'       },
  { id: 'A-127', event: 'Eligibility verified', actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'PHN 9151210417 · James Burnham · Eligible',   time: '14m ago', date: 'Aug 5, 2026', type: 'eligibility' },
  { id: 'A-126', event: 'Claim submitted',       actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'CLM-1041 · $107.20 · Christine Burrows',      time: '1h ago',  date: 'Aug 5, 2026', type: 'claim'       },
  { id: 'A-125', event: 'Claim refused',         actor: 'Teleplan (system)', actorInitials: 'TP', detail: 'CLM-1040 · C12-21 · Austin Mercer',            time: '3h ago',  date: 'Aug 4, 2026', type: 'error'       },
  { id: 'A-124', event: 'Remittance downloaded', actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'R2408-04 · $14,820.00 · 23 claims',            time: '4h ago',  date: 'Aug 4, 2026', type: 'remittance'  },
  { id: 'A-123', event: 'Patient created',       actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'P-008 · Priya Sharma · PHN 9151188234',        time: '6h ago',  date: 'Aug 4, 2026', type: 'patient'     },
  { id: 'A-122', event: 'Claim submitted',       actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'CLM-1039 · $54.00 · Linda Thorpe',             time: '7h ago',  date: 'Aug 4, 2026', type: 'claim'       },
  { id: 'A-121', event: 'Signed in',             actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'IP 24.81.xx.xx · Chrome on macOS',              time: '8h ago',  date: 'Aug 4, 2026', type: 'auth'        },
  { id: 'A-120', event: 'Settings updated',      actor: 'Dr. Ekeoba',         actorInitials: 'DE', detail: 'Teleplan env changed: test → production',       time: '1d ago',  date: 'Aug 3, 2026', type: 'settings'    },
  { id: 'A-119', event: 'Claim paid',            actor: 'Teleplan (system)', actorInitials: 'TP', detail: 'CLM-1038 · $88.35 · Robert Chan',               time: '1d ago',  date: 'Aug 3, 2026', type: 'claim'       },
];

const TYPE_CONFIG: Record<AuditEntry['type'], { icon: any; bg: string; color: string }> = {
  claim:       { icon: FileText,     bg: '#f5f3ff', color: '#8b5cf6' },
  eligibility: { icon: ShieldCheck,  bg: '#ecfdf5', color: '#059669' },
  remittance:  { icon: Receipt,      bg: '#f5f3ff', color: '#7c3aed' },
  auth:        { icon: LogIn,        bg: '#fffbeb', color: '#d97706' },
  settings:    { icon: Settings,     bg: '#f8fafc', color: '#64748b' },
  patient:     { icon: User,         bg: '#ecfdf5', color: '#059669' },
  error:       { icon: AlertTriangle,bg: '#fff1f3', color: '#e11d48' },
};

const FILTER_TYPES = ['all', 'claim', 'eligibility', 'remittance', 'auth', 'settings', 'error'] as const;
type FilterType = typeof FILTER_TYPES[number];

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  const filtered = EVENTS.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.event.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Toolbar */}
      <div className="tbar" style={{ marginBottom: 20 }}>
        <div className="tbar-l">
          <div className="fpills">
            {FILTER_TYPES.map((t) => (
              <button key={t} className={`fpill${typeFilter === t ? ' active' : ''}`} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All events' : t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="fpill-count">
                  {t === 'all' ? EVENTS.length : EVENTS.filter(e => e.type === t).length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="tbar-r">
          <div className="sr" style={{ minWidth: 220 }}>
            <span className="sr-ico"><Search size={14}/></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" />
          </div>
        </div>
      </div>

      {/* Compliance notice */}
      <div className="alrt al-info" style={{ marginBottom: 20 }}>
        <CheckCircle2 size={15} className="alrt-ico" />
        All PHI access events are logged for PIPEDA / FOIPPA / HIPAA compliance. Logs are tamper-evident and retained for 7 years.
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Detail</th>
                <th>Date</th>
                <th>Time</th>
                <th>Ref</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--t4)' }}>No events match this filter.</td></tr>
              )}
              {filtered.map((e) => {
                const cfg = TYPE_CONFIG[e.type];
                return (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <cfg.icon size={14} style={{ color: cfg.color }} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '.84rem' }}>{e.event}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="av av-2" style={{ width: 24, height: 24, fontSize: '.6rem', borderRadius: 7, flexShrink: 0 }}>{e.actorInitials}</span>
                        <span style={{ fontSize: '.82rem', color: 'var(--t2)' }}>{e.actor}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '.8rem', color: 'var(--t3)', maxWidth: 280 }}>
                      <span style={{ fontFamily: 'var(--fm)', fontSize: '.77rem' }}>{e.detail}</span>
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td style={{ fontSize: '.78rem', color: 'var(--t4)', whiteSpace: 'nowrap', fontFamily: 'var(--fm)' }}>{e.time}</td>
                    <td><span className="mono" style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{e.id}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
