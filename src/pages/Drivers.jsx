import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, FileCheck2, Plus, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { api, currency } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Heading, Panel, Button, DataTable, Status, Notice, useNotice, Input } from '../components/UI.jsx';
import ProtectedFile from '../components/ProtectedFile.jsx';

const DOC_LABELS = {
  photo:'Photo',license:'Licence front',licenseBack:'Licence back',aadhaar:'Masked Aadhaar front',
  aadhaarBack:'Masked Aadhaar back',addressProof:'Address proof',policeVerification:'Police verification',
  medicalCertificate:'Medical certificate',experienceProof:'Experience proof',qualificationProof:'Training',
  bankProof:'Masked bank proof',signedAgreement:'Employment agreement',
};

// MySQL JSON fields can be returned as strings; do not treat that as missing media.
function documentMap(value) {
  let result = value;
  for (let i = 0; i < 2 && typeof result === 'string'; i++) {
    try { result = JSON.parse(result); } catch { return {}; }
  }
  return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
}

const addressText = (address) => {
  try {
    const value = typeof address === 'string' ? JSON.parse(address) : address;
    if (!value || typeof value !== 'object') return '—';
    return [value.line1,value.line2,value.city,value.district,value.state,value.pincode].filter(Boolean).join(', ');
  } catch { return '—'; }
};

export default function Drivers() {
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [salaryRate, setSalaryRate] = useState(0);
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [pendingFiles, setPendingFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const notice = useNotice();

  const load = async () => {
    try {
      const { data } = await api.get('/drivers');
      setRows(Array.isArray(data) ? data : []);
      setSelected((current) => current ? data.find((x) => x.id === current.id) || null : null);
    } catch (error) { notice.error(error); }
  };
  useEffect(() => { load(); }, []);
  const open = (driver) => {
    setSelected(driver);
    setPendingFiles({});
    setNoteText('');
    setSalaryRate(Number(driver.profile?.salaryRate || 0));
    setSalaryType(driver.profile?.salaryType || 'MONTHLY');
  };
  const submitDocuments = async () => {
    if (!selected || !Object.values(pendingFiles).some(Boolean)) return notice.error('Select documents to upload');
    const form = new FormData();
    Object.entries(pendingFiles).forEach(([key,file]) => { if (file) form.append(key, file); });
    setBusy(true);
    try {
      await api.post(`/drivers/${selected.id}/documents`, form, { timeout: 120000 });
      await api.post(`/drivers/${selected.id}/submit`);
      notice.success('Files uploaded and verification request submitted');
      setPendingFiles({});
      await load();
    } catch (error) { notice.error(error); }
    finally { setBusy(false); }
  };
  const verify = async (approved) => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.post(`/drivers/${selected.id}/verify`, { approved, note: noteText });
      notice.success(approved ? 'Driver approved' : 'Driver rejected');
      setSelected(null);
      await load();
    } catch (error) { notice.error(error); }
    finally { setBusy(false); }
  };
  const saveSalary = async () => {
    setBusy(true);
    try {
      await api.patch(`/drivers/${selected.id}`, { salaryType, salaryRate: Number(salaryRate) });
      notice.success('Salary settings saved');
      await load();
    } catch (error) { notice.error(error); }
    finally { setBusy(false); }
  };

  const selectedDocuments = documentMap(selected?.profile?.documents);

  return <>
    <Heading title="Driver management" sub="Hire permanent and acting drivers, manage verification and monitor duty availability."
      action={<Link to="/drivers/new" className="btn primary"><Plus size={17}/> Create driver</Link>}/>
    <Notice state={notice}/>
    <Panel title="Driver directory">
      <DataTable headers={['Driver','Employment','Verification','Availability','Salary','']} rows={rows} render={(driver) => <>
        <td><strong>{driver.name}</strong><small className="block muted">{driver.profile?.employeeCode || driver.username || driver.mobile}</small></td>
        <td>{driver.profile?.kind || '—'}</td>
        <td><Status value={driver.profile?.verification}/></td>
        <td><Status value={driver.profile?.available ? 'AVAILABLE' : 'OFFLINE'}/></td>
        <td>{currency(driver.profile?.salaryRate || 0)} / {driver.profile?.salaryType || 'monthly'}</td>
        <td><Button kind="secondary" onClick={() => open(driver)}><ShieldCheck size={16}/> Review</Button></td>
      </>}/>
    </Panel>
    {selected && <Panel title={`Driver profile — ${selected.name}`} action={<Button kind="secondary" onClick={() => setSelected(null)}>Close</Button>}>
      <div className="driver-review-summary">
        <div><span>Employee ID</span><strong>{selected.profile?.employeeCode || '—'}</strong></div>
        <div><span>Login username</span><strong>{selected.username}</strong></div>
        <div><span>Phone</span><strong>{selected.mobile || '—'}</strong></div>
        <div><span>Joining date</span><strong>{selected.profile?.joinedOn || '—'}</strong></div>
        <div><span>Experience</span><strong>{selected.profile?.experienceYears ?? '—'} years</strong></div>
        <div><span>License number</span><strong>{selected.profile?.licenseNumber || '—'}</strong></div>
        <div><span>License expiry</span><strong>{selected.profile?.licenseExpiry || '—'}</strong></div>
        <div><span>Aadhaar last 4</span><strong>{selected.profile?.aadhaarLast4 ? '•••• ' + selected.profile.aadhaarLast4 : '—'}</strong></div>
        <div><span>Emergency contact</span><strong>{selected.profile?.emergencyName || '—'} · {selected.profile?.emergencyMobile || '—'}</strong></div>
        <div><span>Relationship</span><strong>{selected.profile?.emergencyRelation || '—'}</strong></div>
        <div className="driver-review-wide"><span>Permanent address</span><strong>{addressText(selected.profile?.permanentAddress)}</strong></div>
        <div className="driver-review-wide"><span>Temporary address</span><strong>{addressText(selected.profile?.temporaryAddress)}</strong></div>
        <div><span>Background check</span><Status value={selected.profile?.backgroundCheckStatus || 'NOT_STARTED'}/></div>
      </div>
      <h3>Uploaded documents</h3>
      <div className="driver-docs-list">{Object.entries(DOC_LABELS).map(([key,label]) => <div key={key}>
        <span>{label}</span>{selectedDocuments[key] ? <ProtectedFile path={selectedDocuments[key]} label={'View '+label}/> : <small className="muted">Not uploaded</small>}
      </div>)}</div>
      <div className="driver-review-divider"/>
      <h3>Upload missing or replacement documents</h3>
      <div className="driver-doc-upload-grid">{Object.entries(DOC_LABELS).map(([key,label]) => <label key={key}>
        <Upload size={16}/> {label}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) return notice.error('Maximum 5 MB per document');
          setPendingFiles((f) => ({ ...f, [key]: file }));
        }}/>{pendingFiles[key] && <small>Ready: {pendingFiles[key].name}</small>}
      </label>)}</div>
      <div className="form-actions">
        <Button kind="secondary" loading={busy} onClick={submitDocuments}><FileCheck2 size={16}/> Upload and submit verification</Button>
        <Button kind="secondary" disabled={busy} onClick={async () => { try { await api.post(`/drivers/${selected.id}/submit`); notice.success('Verification request submitted'); load(); } catch (error) { notice.error(error); } }}>Submit existing documents</Button>
      </div>
      <div className="driver-review-divider"/>
      <h3>Salary settings</h3>
      <div className="form-grid">
        <Input label="Salary type" as="select" value={salaryType} onChange={(e) => setSalaryType(e.target.value)} options={['MONTHLY','DAILY','PER_TRIP','HOURLY'].map((value) => ({ value, label: value.replaceAll('_', ' ') }))}/>
        <Input label="Salary rate (₹)" type="number" min="0" step="0.01" value={salaryRate} onChange={(e) => setSalaryRate(e.target.value)}/>
      </div>
      <Button kind="secondary" loading={busy} onClick={saveSalary}>Save salary settings</Button>
      <div className="driver-review-divider"/>
      <h3>Document verification</h3>
      <Input label="Verification notes" value={noteText} onChange={(e) => setNoteText(e.target.value)}/>
      <div className="form-actions">
        {can('drivers.verify') ? <>
          <Button disabled={busy || selected.profile?.verification !== 'PENDING'} loading={busy} onClick={() => verify(true)}><Check size={16}/> Approve</Button>
          <Button kind="danger-outline" disabled={busy} onClick={() => verify(false)}><XCircle size={16}/> Reject</Button>
        </> : <p className="muted">Your admin account requires the drivers.verify permission to approve drivers.</p>}
      </div>
    </Panel>}
  </>;
}
