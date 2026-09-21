'use client';

/**
 * Batch Billing Page — /claims/batch
 *
 * Workflow:
 *   1. Search/select patients from the known patient list (or type a new PHN)
 *   2. Set shared billing codes (fee code + ICD-10) that apply to the whole batch
 *   3. Optionally override fee code / notes per patient row
 *   4. Review totals → Save All as drafts
 */

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Search, Plus, X, CheckCircle2, AlertTriangle,
  Users, Loader2, ChevronDown, Save, User, RefreshCw, MapPin,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';
import { saveBatchClaims, type BatchPatient } from '@/lib/actions/claims';

// ── Fee schedules (same as new/page.tsx) ─────────────────────────────────────
const FEE_SCHEDULES: Record<string, { code: string; desc: string; fee: number }[]> = {
  BC: [
    { code: '00110', desc: 'Comprehensive visual assessment',  fee: 88.35  },
    { code: '00111', desc: 'Partial visual assessment',        fee: 54.00  },
    { code: '00113', desc: 'Supplemental visual assessment',   fee: 73.55  },
    { code: '00115', desc: 'Complete eye examination',         fee: 107.20 },
    { code: '00116', desc: 'Limited eye examination',          fee: 54.00  },
    { code: '00118', desc: 'Contact lens evaluation',          fee: 73.55  },
  ],
  AB: [
    { code: '03.03A', desc: 'Limited Assessment (SOMB)',        fee: 40.23 },
    { code: '03.03B', desc: 'Intermediate Assessment',          fee: 62.49 },
    { code: '03.03C', desc: 'Complete Assessment',              fee: 97.74 },
    { code: '03.05A', desc: 'Supplemental Exam',                fee: 34.18 },
    { code: '03.07A', desc: 'Contact Lens Evaluation',          fee: 58.92 },
    { code: '08.19E', desc: 'EMSAF — Corneal Topography',       fee: 71.54 },
  ],
  ON: [
    { code: 'A661A', desc: 'Major Eye Exam (GP)',               fee: 57.28 },
    { code: 'A663A', desc: 'Minor Eye Exam / Follow-up',        fee: 26.25 },
    { code: 'A664A', desc: 'Visual Field Test (unilateral)',    fee: 29.40 },
    { code: 'A665A', desc: 'Visual Field Test (bilateral)',     fee: 49.35 },
    { code: 'A667A', desc: 'Contact Lens Fitting',              fee: 38.10 },
  ],
  MB: [
    { code: '10.10', desc: 'Comprehensive Eye Exam', fee: 75.00 },
    { code: '10.12', desc: 'Partial Eye Exam',        fee: 42.00 },
    { code: '10.14', desc: 'Follow-up Assessment',    fee: 30.00 },
  ],
};

const PROVINCE_META: Record<string, { plan: string; color: string; idLabel: string; idPlaceholder: string }> = {
  BC: { plan: 'Teleplan / MSP',   color: '#059669', idLabel: 'PHN', idPlaceholder: '9151 210 417' },
  AB: { plan: 'AHCIP / H-Link',   color: '#d97706', idLabel: 'PHN', idPlaceholder: '1234-567-890' },
  ON: { plan: 'OHIP / MCEDT',     color: '#8b5cf6', idLabel: 'OHIP', idPlaceholder: '1234-567-890' },
  MB: { plan: 'EPiCS / Manitoba', color: '#0891b2', idLabel: 'PHIN', idPlaceholder: '123456789' },
};

const ICD_CODES = [
  'H52.1 — Myopia','H52.4 — Presbyopia','H40.0 — Glaucoma suspect',
  'H40.1 — Open-angle glaucoma','H53.2 — Diplopia','H27.0 — Aphakia',
  'H35.3 — Degeneration of macula','Z01.0 — Routine eye exam','H35.81 — Retinal edema',
  'H43.1 — Vitreous haemorrhage','Z96.1 — Presence of intraocular lens','H26.0 — Infantile cataract',
  'H50.0 — Convergent strabismus','H52.0 — Hypermetropia','H52.2 — Astigmatism',
];

type Province = 'BC' | 'AB' | 'ON' | 'MB';
const PROV_KEY = 'skyclaims_billing_province';

type KnownPatient = {
  health_card_no: string;
  patient_name: string | null;
  date_of_birth: string | null;
  province: string;
  last_service_date: string;
};

// Per-patient row in the batch. Overrides are optional; null = use shared default.
type BatchRow = {
  id: string; // local id for React key
  phn: string;
  name: string;
  dob: string;
  province: Province;
  overrideFeeCode: string | null;
  overrideDx: string | null;
  overrideNotes: string;
  expanded: boolean; // expand override panel
};

function fmt$(n: number) {
  return '$' + n.toFixed(2);
}
function initials(name: string) {
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';
}

export default function BatchBillingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Province
  const [province, setProvince] = useState<Province>('BC');
  const [showProv, setShowProv] = useState(false);

  // Shared defaults
  const [dos, setDos] = useState(new Date().toISOString().slice(0, 10));
  const [sharedFeeCode, setSharedFeeCode] = useState('00110');
  const [sharedDx, setSharedDx] = useState('H52.1 — Myopia');

  // Patient list / search
  const [knownPatients, setKnownPatients] = useState<KnownPatient[]>([]);
  const [loadingPats, setLoadingPats] = useState(true);
  const [search, setSearch] = useState('');
  const [newPhn, setNewPhn] = useState('');
  const [newName, setNewName] = useState('');

  // Batch rows
  const [rows, setRows] = useState<BatchRow[]>([]);

  // Result
  const [result, setResult] = useState<{ saved: number; errors: { phn: string; error: string }[] } | null>(null);
  const [done, setDone] = useState(false);

  // Load province: localStorage override → practice profile default
  useEffect(() => {
    const localOverride = localStorage.getItem(PROV_KEY) as Province | null;
    if (localOverride) {
      setProvince(localOverride);
      setSharedFeeCode(FEE_SCHEDULES[localOverride]?.[0]?.code ?? '00110');
    }
    // Always fetch practice's registered province as the base default
    fetch('/api/practice/province')
      .then(r => r.json())
      .then(({ province: practiceProvince }: { province: string }) => {
        if (!localOverride) {
          const p = (practiceProvince as Province) ?? 'BC';
          setProvince(p);
          setSharedFeeCode(FEE_SCHEDULES[p]?.[0]?.code ?? '00110');
        }
      })
      .catch(() => {/* silently fall back */});
  }, []);

  // Load known patients
  useEffect(() => {
    fetch('/api/patients/list')
      .then(r => r.json())
      .then((data: KnownPatient[]) => setKnownPatients(data ?? []))
      .catch(() => setKnownPatients([]))
      .finally(() => setLoadingPats(false));
  }, []);

  const codes = FEE_SCHEDULES[province] ?? FEE_SCHEDULES.BC;
  const sharedFeeItem = codes.find(c => c.code === sharedFeeCode) ?? codes[0];

  function changeProvince(p: Province) {
    setProvince(p);
    localStorage.setItem(PROV_KEY, p);
    setSharedFeeCode(FEE_SCHEDULES[p]?.[0]?.code ?? '00110');
    // Update province on rows that haven't been manually overridden
    setRows(r => r.map(row => ({ ...row, province: p })));
  }

  // Filter known patients
  const filtered = knownPatients.filter(p => {
    const q = search.toLowerCase();
    return (
      (p.patient_name ?? '').toLowerCase().includes(q) ||
      p.health_card_no.includes(q)
    );
  }).slice(0, 20);

  const inBatch = new Set(rows.map(r => r.phn));

  function addRow(phn: string, name: string, dob: string, prov: Province) {
    if (inBatch.has(phn)) return; // already added
    setRows(prev => [...prev, {
      id: `${phn}-${Date.now()}`,
      phn,
      name,
      dob,
      province: prov,
      overrideFeeCode: null,
      overrideDx: null,
      overrideNotes: '',
      expanded: false,
    }]);
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<BatchRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function addManual() {
    const clean = newPhn.replace(/\s/g, '');
    if (!clean) return;
    addRow(clean, newName, '', province);
    setNewPhn('');
    setNewName('');
  }

  const totalFee = rows.reduce((sum, row) => {
    const rowFeeCode = row.overrideFeeCode ?? sharedFeeCode;
    const rowCodes = FEE_SCHEDULES[row.province] ?? FEE_SCHEDULES.BC;
    const item = rowCodes.find(c => c.code === rowFeeCode) ?? rowCodes[0];
    return sum + (item?.fee ?? 0);
  }, 0);

  async function handleSave() {
    if (rows.length === 0) return;
    startTransition(async () => {
      const patients: BatchPatient[] = rows.map(row => {
        const rowFeeCode = row.overrideFeeCode ?? sharedFeeCode;
        const rowCodes = FEE_SCHEDULES[row.province] ?? FEE_SCHEDULES.BC;
        const item = rowCodes.find(c => c.code === rowFeeCode) ?? rowCodes[0];
        return {
          health_card_no: row.phn,
          patient_name:   row.name || undefined,
          date_of_birth:  row.dob || undefined,
          province:       row.province,
          fee_code:       item?.code,
          fee_desc:       item?.desc,
          fee_amount:     item?.fee,
          dx_code:        row.overrideDx ?? sharedDx,
          notes:          row.overrideNotes || undefined,
        };
      });

      const res = await saveBatchClaims({
        province,
        dos,
        fee_code:   sharedFeeItem?.code ?? sharedFeeCode,
        fee_desc:   sharedFeeItem?.desc ?? '',
        fee_amount: sharedFeeItem?.fee ?? 0,
        dx_code:    sharedDx,
        patients,
      });
      setResult(res);
      setDone(true);
    });
  }

  if (done && result) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div className="card cp" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ok-lt)', border: '2px solid var(--ok-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={26} style={{ color: 'var(--ok)' }}/>
          </div>
          <h2 style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: '1.35rem', marginBottom: 8 }}>
            Batch Saved
          </h2>
          <p style={{ fontSize: '.88rem', color: 'var(--t3)', marginBottom: 20 }}>
            {result.saved} claim{result.saved !== 1 ? 's' : ''} saved as drafts.
          </p>
          {result.errors.length > 0 && (
            <div className="alrt al-err" style={{ marginBottom: 20, textAlign: 'left' }}>
              <AlertTriangle size={13} className="alrt-ico"/> {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '.78rem' }}>
                {result.errors.map(e => <li key={e.phn}>{e.phn}: {e.error}</li>)}
              </ul>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => { setDone(false); setResult(null); setRows([]); }} className="btn btn-g">
              New Batch
            </button>
            <Link href="/claims" className="btn btn-p">View Claims →</Link>
          </div>
        </div>
      </div>
    );
  }

  const metaColor = PROVINCE_META[province]?.color ?? '#059669';

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <p style={{ marginBottom: 16 }}>
        <Link href="/claims/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '.82rem', color: 'var(--t3)', textDecoration: 'none', fontWeight: 600 }}>
          <ArrowLeft size={13}/> Back to New Claim
        </Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--ff)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-.02em', marginBottom: 4 }}>
            Batch Billing
          </h1>
          <p style={{ fontSize: '.84rem', color: 'var(--t3)' }}>
            Select multiple patients, set shared codes, and save all claims at once.
          </p>
        </div>
        {/* Province badge */}
        <button
          type="button"
          onClick={() => setShowProv(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 10, border: `1.5px solid ${metaColor}40`,
            background: metaColor + '0e', cursor: 'pointer', flexShrink: 0, marginTop: 4,
          }}
        >
          <MapPin size={13} style={{ color: metaColor }}/>
          <span style={{ fontWeight: 700, fontSize: '.82rem', color: metaColor }}>{province}</span>
          <span style={{ fontSize: '.72rem', color: 'var(--t3)' }}>· {PROVINCE_META[province]?.plan.split(' / ')[0]}</span>
          <RefreshCw size={11} style={{ color: 'var(--t4)', marginLeft: 2 }}/>
        </button>
      </div>

      {/* Province modal */}
      {showProv && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowProv(false)}
        >
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 24, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '.95rem' }}>Billing Province</div>
            {(['BC', 'AB', 'ON', 'MB'] as Province[]).map(p => {
              const pm = PROVINCE_META[p];
              return (
                <button key={p} onClick={() => { changeProvince(p); setShowProv(false); }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 6, borderRadius: 8, border: `1.5px solid ${p === province ? pm.color : 'var(--bd)'}`,
                  background: p === province ? pm.color + '0e' : 'transparent', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontWeight: 700, color: pm.color, fontSize: '.88rem' }}>{p}</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--t3)' }}>{pm.plan}</span>
                  {p === province && <CheckCircle2 size={14} style={{ color: pm.color, marginLeft: 'auto' }}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left: Patient picker ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Add by PHN */}
          <div className="card cp">
            <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Plus size={14} style={{ color: 'var(--sky)' }}/> Add Patient
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                placeholder={PROVINCE_META[province]?.idPlaceholder ?? '...'}
                value={newPhn}
                onChange={e => setNewPhn(e.target.value)}
                style={{ fontFamily: 'var(--fm)', letterSpacing: '.08em' }}
              />
              <input
                type="text"
                placeholder="Name (optional)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-p"
                onClick={addManual}
                disabled={!newPhn.trim()}
                style={{ justifyContent: 'center' }}
              >
                <Plus size={13}/> Add to Batch
              </button>
            </div>
          </div>

          {/* Known patients */}
          <div className="card">
            <div className="cp" style={{ paddingBottom: 0 }}>
              <div className="ch">
                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Users size={14} style={{ color: 'var(--t4)' }}/> Known Patients
                </div>
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)' }}>
              <div className="sr">
                <span className="sr-ico"><Search size={13}/></span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or PHN…"
                />
              </div>
            </div>
            {loadingPats ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t4)', fontSize: '.8rem' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }}/> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t4)', fontSize: '.8rem' }}>
                {search ? 'No patients match.' : 'No patients yet — add PHN above.'}
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {filtered.map(p => {
                  const alreadyIn = inBatch.has(p.health_card_no);
                  const pm = PROVINCE_META[p.province] ?? PROVINCE_META.BC;
                  return (
                    <button
                      key={p.health_card_no}
                      type="button"
                      onClick={() => !alreadyIn && addRow(p.health_card_no, p.patient_name ?? '', p.date_of_birth ?? '', p.province as Province)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderBottom: '1px solid var(--bd)', textAlign: 'left',
                        background: alreadyIn ? 'var(--n50)' : 'transparent', border: 'none',
                        cursor: alreadyIn ? 'default' : 'pointer',
                        opacity: alreadyIn ? 0.55 : 1,
                      }}
                    >
                      <span className="av av-1" style={{ flexShrink: 0, width: 30, height: 30, fontSize: '.72rem' }}>
                        {initials(p.patient_name ?? '?')}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.patient_name ?? <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>No name</span>}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>
                          {p.health_card_no}
                        </div>
                      </div>
                      <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: pm.color + '14', color: pm.color, flexShrink: 0 }}>
                        {p.province}
                      </span>
                      {alreadyIn
                        ? <CheckCircle2 size={14} style={{ color: 'var(--ok)', flexShrink: 0 }}/>
                        : <Plus size={13} style={{ color: 'var(--t4)', flexShrink: 0 }}/>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Shared codes + batch rows ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Shared billing codes */}
          <div className="card cp">
            <div className="ch">
              <div className="ct">Shared Billing Codes</div>
              <span style={{ fontSize: '.74rem', color: 'var(--t3)', fontWeight: 600 }}>
                Applies to all rows unless overridden
              </span>
            </div>
            <div className="fg">
              <div className="fg fg2">
                <div className="field">
                  <label>Date of service <span style={{ color: 'var(--bad)' }}>*</span></label>
                  <input type="date" value={dos} onChange={e => setDos(e.target.value)}/>
                </div>
                <div className="field">
                  <label>Fee code <span style={{ color: 'var(--bad)' }}>*</span></label>
                  <select
                    value={sharedFeeCode}
                    onChange={e => setSharedFeeCode(e.target.value)}
                    style={{ fontFamily: 'var(--fm)' }}
                  >
                    {codes.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} — ${c.fee.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {sharedFeeItem && (
                    <div style={{ fontSize: '.73rem', color: 'var(--t3)', marginTop: 4 }}>
                      {sharedFeeItem.desc} · <strong style={{ color: 'var(--sky-dk)' }}>${sharedFeeItem.fee.toFixed(2)}</strong> each
                    </div>
                  )}
                </div>
              </div>
              <div className="field">
                <label>Diagnosis code (ICD-10)</label>
                <select value={sharedDx} onChange={e => setSharedDx(e.target.value)}>
                  <option value="">— Select —</option>
                  {ICD_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Batch rows */}
          <div className="card">
            <div className="cp" style={{ paddingBottom: 0 }}>
              <div className="ch">
                <div className="ct" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Users size={14} style={{ color: 'var(--t4)' }}/>
                  Batch — {rows.length} patient{rows.length !== 1 ? 's' : ''}
                </div>
                {rows.length > 0 && (
                  <span style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '.88rem', color: 'var(--sky-dk)' }}>
                    Total {fmt$(totalFee)}
                  </span>
                )}
              </div>
            </div>

            {rows.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--t4)', fontSize: '.82rem' }}>
                <User size={22} style={{ display: 'block', margin: '0 auto 10px', opacity: .4 }}/>
                Add patients from the left panel to build your batch.
              </div>
            ) : (
              <div>
                {rows.map((row, idx) => {
                  const rowFeeCode = row.overrideFeeCode ?? sharedFeeCode;
                  const rowCodes = FEE_SCHEDULES[row.province] ?? FEE_SCHEDULES.BC;
                  const rowFeeItem = rowCodes.find(c => c.code === rowFeeCode) ?? rowCodes[0];
                  const pm = PROVINCE_META[row.province] ?? PROVINCE_META.BC;
                  const hasOverride = !!row.overrideFeeCode || !!row.overrideDx;

                  return (
                    <div key={row.id} style={{ borderBottom: idx < rows.length - 1 ? '1px solid var(--bd)' : 'none' }}>
                      {/* Row summary */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                        <span className="av av-2" style={{ flexShrink: 0, width: 32, height: 32, fontSize: '.72rem' }}>
                          {initials(row.name || row.phn)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.name || <span style={{ color: 'var(--t4)', fontStyle: 'italic' }}>No name</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: '.7rem', color: 'var(--t4)', fontFamily: 'var(--fm)' }}>{row.phn}</span>
                            <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: pm.color + '14', color: pm.color }}>{row.province}</span>
                            {hasOverride && (
                              <span style={{ fontSize: '.67rem', fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'var(--violet-lt)', color: 'var(--violet)' }}>customised</span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--fm)', fontWeight: 700, fontSize: '.9rem', color: 'var(--sky-dk)' }}>
                            {fmt$(rowFeeItem?.fee ?? 0)}
                          </div>
                          <div style={{ fontSize: '.68rem', color: 'var(--t4)' }}>{rowFeeCode}</div>
                        </div>
                        {/* Override toggle */}
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, { expanded: !row.expanded })}
                          title="Customise this row"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}
                        >
                          <Pencil size={13}/>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}
                        >
                          <X size={14}/>
                        </button>
                      </div>

                      {/* Expandable override panel */}
                      {row.expanded && (
                        <div style={{ padding: '0 16px 14px', background: 'var(--n50)', borderTop: '1px solid var(--bd)' }}>
                          <div style={{ fontSize: '.76rem', color: 'var(--t3)', padding: '10px 0 8px', fontWeight: 600 }}>
                            Per-patient overrides (leave blank to use shared defaults)
                          </div>
                          <div className="fg">
                            <div className="fg fg2">
                              <div className="field">
                                <label style={{ fontSize: '.75rem' }}>Fee code override</label>
                                <select
                                  value={row.overrideFeeCode ?? ''}
                                  onChange={e => updateRow(row.id, { overrideFeeCode: e.target.value || null })}
                                  style={{ fontFamily: 'var(--fm)', fontSize: '.8rem' }}
                                >
                                  <option value="">— Use shared ({sharedFeeCode}) —</option>
                                  {rowCodes.map(c => (
                                    <option key={c.code} value={c.code}>
                                      {c.code} — ${c.fee.toFixed(2)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="field">
                                <label style={{ fontSize: '.75rem' }}>Diagnosis override</label>
                                <select
                                  value={row.overrideDx ?? ''}
                                  onChange={e => updateRow(row.id, { overrideDx: e.target.value || null })}
                                  style={{ fontSize: '.8rem' }}
                                >
                                  <option value="">— Use shared —</option>
                                  {ICD_CODES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="field">
                              <label style={{ fontSize: '.75rem' }}>Internal notes</label>
                              <input
                                type="text"
                                value={row.overrideNotes}
                                onChange={e => updateRow(row.id, { overrideNotes: e.target.value })}
                                placeholder="Optional note for this patient"
                                style={{ fontSize: '.8rem' }}
                              />
                            </div>
                            <div className="field">
                              <label style={{ fontSize: '.75rem' }}>Patient name</label>
                              <input
                                type="text"
                                value={row.name}
                                onChange={e => updateRow(row.id, { name: e.target.value })}
                                placeholder="Name"
                                style={{ fontSize: '.8rem' }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            {rows.length > 0 && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '.82rem', color: 'var(--t3)' }}>
                  {rows.length} patient{rows.length !== 1 ? 's' : ''} · Total{' '}
                  <strong style={{ color: 'var(--sky-dk)' }}>{fmt$(totalFee)}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending || rows.length === 0}
                  className="btn btn-p"
                >
                  {isPending
                    ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> Saving…</>
                    : <><Save size={13}/> Save {rows.length} Draft{rows.length !== 1 ? 's' : ''}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
