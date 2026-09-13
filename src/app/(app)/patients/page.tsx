'use client';
import { useState } from 'react';
import { Search, Plus, Users, Phone, Calendar, ChevronRight } from 'lucide-react';

const PATIENTS = [
  { id: 'P-001', name: 'James Burnham',    initials: 'JB', phn: '9151210417', dob: '1962-03-14', phone: '(604) 555-0181', province: 'BC', lastVisit: 'Aug 5, 2026',  totalClaims: 4, totalAmount: '$347.40', status: 'active' },
  { id: 'P-002', name: 'Christine Burrows', initials: 'CB', phn: '9151065434', dob: '1978-05-22', phone: '(604) 555-0142', province: 'BC', lastVisit: 'Aug 5, 2026',  totalClaims: 2, totalAmount: '$214.40', status: 'active' },
  { id: 'P-003', name: 'Austin Mercer',     initials: 'AM', phn: '9151242549', dob: '1990-11-08', phone: '(604) 555-0173', province: 'BC', lastVisit: 'Aug 4, 2026',  totalClaims: 1, totalAmount: '$88.35',  status: 'refused' },
  { id: 'P-004', name: 'Linda Thorpe',      initials: 'LT', phn: '9151071072', dob: '1955-07-30', phone: '(604) 555-0109', province: 'BC', lastVisit: 'Aug 4, 2026',  totalClaims: 3, totalAmount: '$162.00', status: 'active' },
  { id: 'P-005', name: 'Robert Chan',       initials: 'RC', phn: '9151274799', dob: '1983-02-17', phone: '(604) 555-0155', province: 'BC', lastVisit: 'Aug 3, 2026',  totalClaims: 5, totalAmount: '$441.75', status: 'active' },
  { id: 'P-006', name: 'Sarah Nikolaev',    initials: 'SN', phn: '9151206012', dob: '1971-09-03', phone: '(604) 555-0194', province: 'BC', lastVisit: 'Aug 3, 2026',  totalClaims: 1, totalAmount: '$73.55',  status: 'active' },
  { id: 'P-007', name: 'Michael Torres',    initials: 'MT', phn: '9151259051', dob: '1988-12-25', phone: '(604) 555-0167', province: 'BC', lastVisit: 'Aug 3, 2026',  totalClaims: 1, totalAmount: '$88.35',  status: 'active' },
  { id: 'P-008', name: 'Priya Sharma',      initials: 'PS', phn: '9151188234', dob: '1995-06-11', phone: '(604) 555-0120', province: 'BC', lastVisit: 'Aug 2, 2026',  totalClaims: 2, totalAmount: '$176.70', status: 'active' },
];

const AV_COLOR = ['av-1','av-2','av-3','av-4','av-5'];

export default function PatientsPage() {
  const [search, setSearch] = useState('');

  const filtered = PATIENTS.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.phn.includes(q) || p.phone.includes(q);
  });

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Toolbar */}
      <div className="tbar" style={{ marginBottom: 20 }}>
        <div className="tbar-l">
          <div className="sr" style={{ minWidth: 280 }}>
            <span className="sr-ico"><Search size={14}/></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, PHN, phone…" />
          </div>
        </div>
        <div className="tbar-r">
          <button className="btn btn-p"><Plus size={14}/> Add Patient</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stico" style={{ background: 'var(--sky-lt)', margin: 0 }}>
            <Users size={18} style={{ color: 'var(--sky)' }} />
          </div>
          <div>
            <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Patients</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--sky-dk)', lineHeight: 1 }}>{PATIENTS.length}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stico" style={{ background: 'var(--ok-lt)', margin: 0 }}>
            <Calendar size={18} style={{ color: 'var(--ok)' }} />
          </div>
          <div>
            <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Seen This Month</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--sky-dk)', lineHeight: 1 }}>8</div>
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="stico" style={{ background: 'var(--violet-lt)', margin: 0 }}>
            <Phone size={18} style={{ color: 'var(--violet)' }} />
          </div>
          <div>
            <div style={{ fontSize: '.7rem', color: 'var(--t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>MTD Revenue</div>
            <div style={{ fontFamily: 'var(--ff)', fontSize: '1.6rem', fontWeight: 400, color: 'var(--sky-dk)', lineHeight: 1 }}>$18,420</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>PHN</th>
                <th>Date of Birth</th>
                <th>Phone</th>
                <th>Province</th>
                <th>Last Visit</th>
                <th>Claims</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: 'var(--t4)' }}>No patients found.</td></tr>
              )}
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`av ${AV_COLOR[i % AV_COLOR.length]}`}>{p.initials}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--t4)' }}>{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="mono">{p.phn}</span></td>
                  <td style={{ color: 'var(--t2)', fontSize: '.83rem' }}>{p.dob}</td>
                  <td style={{ color: 'var(--t2)', fontSize: '.83rem' }}>{p.phone}</td>
                  <td>
                    <span style={{ fontSize: '.76rem', fontWeight: 700, background: 'var(--sky-lt)', color: 'var(--sky-dk)', padding: '2px 8px', borderRadius: 6 }}>{p.province}</span>
                  </td>
                  <td style={{ color: 'var(--t3)', fontSize: '.82rem' }}>{p.lastVisit}</td>
                  <td style={{ fontFamily: 'var(--fm)', fontSize: '.82rem', color: 'var(--t2)', textAlign: 'center' }}>{p.totalClaims}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.totalAmount}</td>
                  <td>
                    <button className="btn btn-g btn-xs" style={{ padding: '5px 8px' }}>
                      <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
