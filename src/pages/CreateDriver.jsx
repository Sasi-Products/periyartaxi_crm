import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, BriefcaseBusiness, Camera, CheckCircle2,
  ClipboardCheck, Copy, FileText, KeyRound, MapPin, Plus, ShieldCheck,
  Upload, UserRound, UsersRound, Eye, EyeOff,
} from 'lucide-react';
import { api, errText } from '../lib/api.js';
import { MapCanvas } from '../components/Maps.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Heading, Panel, Input, Button, Notice, useNotice } from '../components/UI.jsx';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const emptyAddress = () => ({ line1: '', line2: '', city: '', district: '', state: 'Tamil Nadu', pincode: '' });
const createInitialForm = () => ({
  name: '', username: '', mobile: '', email: '', password: '',
  branchId: '', kind: 'PERMANENT', joinedOn: today(), dateOfBirth: '',
  experienceYears: '', licenseNumber: '', licenseExpiry: '', licenseClasses: 'LMV',
  aadhaarLast4: '', permanentAddress: emptyAddress(), temporaryAddress: emptyAddress(),
  emergencyName: '', emergencyMobile: '', emergencyRelation: '',
  salaryType: 'MONTHLY', salaryRate: '', bloodGroup: '', languages: 'Tamil',
  referenceName: '', referenceMobile: '', homeLat: '', homeLng: '', backgroundCheckStatus: 'NOT_STARTED',
  onboardingNote: '',
});
const DOC_GROUPS = [
  { key: 'photo', label: 'Driver photo', mandatory: true, hint: 'JPG / PNG / WebP', capture: 'user' },
  { key: 'license', label: 'Driving licence — front', mandatory: true, hint: 'Clear card scan' },
  { key: 'licenseBack', label: 'Driving licence — back', hint: 'If details are on reverse' },
  { key: 'aadhaar', label: 'Masked Aadhaar — front', mandatory: true, hint: 'Only last 4 digits visible' },
  { key: 'aadhaarBack', label: 'Masked Aadhaar — back', hint: 'Hide full Aadhaar number' },
  { key: 'addressProof', label: 'Other address proof', hint: 'Optional' },
  { key: 'policeVerification', label: 'Police verification', hint: 'Optional pending verification' },
  { key: 'medicalCertificate', label: 'Medical fitness certificate', hint: 'If applicable' },
  { key: 'experienceProof', label: 'Experience proof', hint: 'Optional' },
  { key: 'qualificationProof', label: 'Training certificate', hint: 'Optional' },
  { key: 'bankProof', label: 'Masked bank proof', hint: 'Optional; hide full account number' },
  { key: 'signedAgreement', label: 'Signed employment agreement', hint: 'Optional' },
];

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function SectionTitle({ index, title, description, icon: Icon }) {
  return <div className="driver-section-head">
    <span className="driver-section-number">{index}</span>
    <div><h3><Icon size={19} /> {title}</h3><p>{description}</p></div>
  </div>;
}

function DocumentInput({ document, file, onChange }) {
  const Icon = document.key === 'photo' ? Camera : FileText;
  return <label className={`driver-document-card ${file ? 'uploaded' : ''}`}>
    <input type="file" accept={document.key === 'photo' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'}
      onChange={(event) => onChange(document.key, event.target.files?.[0] || null)} />
    <span className="driver-document-icon"><Icon size={22} /></span>
    <strong>{document.label}{document.mandatory && <b className="required-dot"> *</b>}</strong>
    <small>{file ? file.name : document.hint}</small>
    <span className="driver-document-action">{file ? <><CheckCircle2 size={15}/> Ready</> : <><Upload size={15}/> Upload</>}</span>
  </label>;
}

export default function CreateDriver() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notice = useNotice();
  const [form, setForm] = useState(createInitialForm);
  const [files, setFiles] = useState({});
  const [branches, setBranches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [created, setCreated] = useState(null);
  const uploaded = useMemo(() => Object.keys(files).filter((key) => files[key]).length, [files]);
  const selectedBranch = branches.find((branch) => String(branch.id) === String(form.branchId));
  const homePosition = form.homeLat !== '' && form.homeLng !== ''
    ? { lat: Number(form.homeLat), lng: Number(form.homeLng) } : null;
  const initialMapCenter = { lat: Number(selectedBranch?.centerLat) || 11.341, lng: Number(selectedBranch?.centerLng) || 77.7172 };

  useEffect(() => {
    api.get('/branches').then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setBranches(list);
      setForm((current) => ({ ...current, branchId: current.branchId || String(user?.branchId || list[0]?.id || '') }));
    }).catch(notice.error);
  }, [user?.branchId]);

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const addressChange = (field, key, value) => setForm((current) => ({
    ...current, [field]: { ...current[field], [key]: value },
  }));
  const selectedFile = (key, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notice.error(`${key}: maximum 5 MB per file`);
    setFiles((current) => ({ ...current, [key]: file }));
  };

  async function copy(value, label) {
    try { await navigator.clipboard.writeText(value); setCopyMessage(`${label} copied`); }
    catch { setCopyMessage('Copy not permitted by this browser; select the text instead'); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    if (!form.branchId) return notice.error('Select a branch');
    if (!form.password || form.password.length < 12) return notice.error('Temporary password must contain at least 12 characters');
    if (!/^\d{4}$/.test(form.aadhaarLast4)) return notice.error('Only last four Aadhaar digits are required');
    if (!/^\d{6}$/.test(form.permanentAddress.pincode)) return notice.error('Enter a valid 6-digit permanent address pincode');
    const temporary = Object.values(form.temporaryAddress).some((value) => String(value || '').trim() && value !== 'Tamil Nadu');
    if (temporary && !/^\d{6}$/.test(form.temporaryAddress.pincode)) return notice.error('Enter a valid temporary address pincode');
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (key === 'temporaryAddress' && !temporary) continue;
      if (['permanentAddress', 'temporaryAddress'].includes(key)) data.append(key, JSON.stringify(value));
      else if (value !== '' && value != null) data.append(key, String(value));
    }
    Object.entries(files).forEach(([key, file]) => { if (file) data.append(key, file); });
    setBusy(true);
    try {
      const { data: result } = await api.post('/drivers/onboard', data, { timeout: 120000 });
      // Only retained in memory on this page; server stores the bcrypt hash, not this password.
      setCreated({ ...result, password: form.password });
      setForm((previous) => ({ ...previous, password: '' }));
      notice.success('Driver account and employment profile created.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { notice.error(errText(error)); }
    finally { setBusy(false); }
  }

  if (created) return <div className="driver-create-page">
    <Heading title="Driver successfully registered" sub="Share credentials through a secure channel. The password is displayed only on this screen."/>
    <Notice state={notice}/>
    <Panel title="Driver account created" className="driver-created-panel">
      <div className="driver-success-icon"><BadgeCheck size={35}/></div>
      <h2>{created.name}</h2>
      <p>Employee code: <strong>{created.employeeCode}</strong></p>
      <div className="driver-credentials">
        <div><span>Username</span><strong>{created.username}</strong><button type="button" onClick={() => copy(created.username, 'Username')}><Copy size={17}/></button></div>
        <div><span>Temporary password</span><strong>{showPassword ? created.password : '••••••••••••••••'}</strong><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button><button type="button" onClick={() => copy(created.password, 'Temporary password')}><Copy size={17}/></button></div>
      </div>
      {copyMessage && <p className="driver-hint">{copyMessage}</p>}
      <p className="driver-warning">Driver must change the temporary password when first signing in. The account cannot receive trips until documents are approved, duty is active and a vehicle is assigned.</p>
      <div className="form-actions"><Button onClick={() => navigate('/drivers')}><UsersRound size={16}/> Driver directory</Button><Button kind="secondary" onClick={() => { setCreated(null); setFiles({}); setForm({ ...createInitialForm(), branchId: form.branchId }); }}>Register another driver</Button></div>
    </Panel>
  </div>;

  return <div className="driver-create-page">
    <Heading title="Register new driver" sub="Create login access, capture employment details and upload verification documents."
      action={<Link to="/drivers" className="btn secondary"><ArrowLeft size={17}/> Back to drivers</Link>}/>
    <Notice state={notice}/>
    <div className="driver-onboard-note"><ShieldCheck size={19}/><div><strong>Secure driver onboarding</strong><p>Documents are private. Store only the last four digits of Aadhaar and upload masked Aadhaar scans. New drivers remain offline until approval.</p></div></div>
    <form onSubmit={handleSubmit} className="driver-create-form">
      <Panel>
        <SectionTitle index="01" title="Personal details" icon={UserRound} description="The driver's official identity and contact information."/>
        <div className="form-grid">
          <Input label="Full name *" required maxLength={140} value={form.name} onChange={(e) => change('name', e.target.value)}/>
          <Input label="Mobile number *" required placeholder="+91XXXXXXXXXX" value={form.mobile} onChange={(e) => change('mobile', e.target.value)}/>
          <Input label="Email (optional)" type="email" value={form.email} onChange={(e) => change('email', e.target.value)}/>
          <Input label="Date of birth *" required type="date" max={today()} value={form.dateOfBirth} onChange={(e) => change('dateOfBirth', e.target.value)}/>
          <Input label="Blood group (optional)" as="select" value={form.bloodGroup} onChange={(e) => change('bloodGroup', e.target.value)} options={['','A+','A-','B+','B-','AB+','AB-','O+','O-'].map((v) => ({ value: v, label: v || 'Not specified' }))}/>
          <Input label="Languages spoken" value={form.languages} onChange={(e) => change('languages', e.target.value)}/>
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="02" title="Employment & salary" icon={BriefcaseBusiness} description="Driver type, location, joining date and salary policy."/>
        <div className="form-grid">
          <Input label="Assigned branch *" as="select" required value={form.branchId} onChange={(e) => change('branchId', e.target.value)} options={[{ value: '', label: 'Select branch' }, ...branches.filter((b) => b.active).map((b) => ({ value: b.id, label: b.name }))]}/>
          <Input label="Employment type" as="select" value={form.kind} onChange={(e) => change('kind', e.target.value)} options={[{ value: 'PERMANENT', label: 'Permanent' }, { value: 'ACTING', label: 'Acting / On-call' }]}/>
          <Input label="Joining date *" required type="date" value={form.joinedOn} onChange={(e) => change('joinedOn', e.target.value)}/>
          <Input label="Driving experience (years)" type="number" min="0" max="75" value={form.experienceYears} onChange={(e) => change('experienceYears', e.target.value)}/>
          <Input label="Salary type" as="select" value={form.salaryType} onChange={(e) => change('salaryType', e.target.value)} options={['MONTHLY','DAILY','PER_TRIP','HOURLY'].map((v) => ({ value: v, label: v.replaceAll('_', ' ') }))}/>
          <Input label="Salary rate (₹)" type="number" min="0" step="0.01" value={form.salaryRate} onChange={(e) => change('salaryRate', e.target.value)}/>
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="03" title="Login credentials" icon={KeyRound} description="A private account for the Driver App. The password must be changed at first login."/>
        <div className="form-grid">
          <Input label="Driver username *" required minLength={4} maxLength={40} autoComplete="off" placeholder="e.g. periyar.driver01" value={form.username} onChange={(e) => change('username', e.target.value)}/>
          <div className="driver-password-field"><Input label="Temporary password *" required minLength={12} maxLength={128} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => change('password', e.target.value)}/><div><button type="button" onClick={() => change('password', randomPassword())}>Generate secure password</button><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="04" title="Driving licence & identity" icon={ClipboardCheck} description="Validate driving eligibility before the driver is approved."/>
        <div className="form-grid">
          <Input label="Driving licence number *" required value={form.licenseNumber} onChange={(e) => change('licenseNumber', e.target.value)}/>
          <Input label="Driving licence expiry *" required type="date" min={today()} value={form.licenseExpiry} onChange={(e) => change('licenseExpiry', e.target.value)}/>
          <Input label="Licence vehicle classes" placeholder="LMV, TRANSPORT ..." value={form.licenseClasses} onChange={(e) => change('licenseClasses', e.target.value)}/>
          <Input label="Aadhaar last 4 digits *" required maxLength={4} inputMode="numeric" pattern="[0-9]{4}" value={form.aadhaarLast4} onChange={(e) => change('aadhaarLast4', e.target.value.replace(/\D/g, '').slice(0,4))}/>
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="05" title="Permanent address" icon={MapPin} description="Primary home address used for emergency contact and branch planning."/>
        <div className="form-grid">
          {[
            ['line1', 'House / street address *'], ['line2', 'Area / landmark'],
            ['city', 'Town / city *'], ['district', 'District *'],
            ['state', 'State *'], ['pincode', 'PIN code *'],
          ].map(([key, label]) => <Input key={key} label={label} required={['line1','city','district','state','pincode'].includes(key)} maxLength={key === 'pincode' ? 6 : 180} value={form.permanentAddress[key] || ''} onChange={(e) => addressChange('permanentAddress', key, e.target.value)}/>)}
        </div>
        <div className="driver-home-picker">
          <strong>Driver home location on map</strong>
          <p>Optional map pin based on the permanent address. Click once to store the precise home location; live duty location will still come from the driver's phone.</p>
          <MapCanvas center={homePosition || initialMapCenter} marker={homePosition} height={290} zoom={12}
            onClick={({ lat, lng }) => setForm((current) => ({ ...current, homeLat: Number(lat.toFixed(7)), homeLng: Number(lng.toFixed(7)) }))}/>
          <div className="driver-home-coordinates"><span>{homePosition ? `Home location selected: ${homePosition.lat.toFixed(6)}, ${homePosition.lng.toFixed(6)}` : 'No home map pin selected'}</span>
            {homePosition && <button type="button" onClick={() => setForm((current) => ({ ...current, homeLat: '', homeLng: '' }))}>Clear pin</button>}</div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="06" title="Temporary / current address" icon={MapPin} description="Optional — fill only if the driver lives somewhere different."/>
        <div className="form-grid">
          {[
            ['line1','House / street address'], ['line2','Area / landmark'],
            ['city','Town / city'], ['district','District'],
            ['state','State'], ['pincode','PIN code'],
          ].map(([key, label]) => <Input key={key} label={label} maxLength={key === 'pincode' ? 6 : 180} value={form.temporaryAddress[key] || ''} onChange={(e) => addressChange('temporaryAddress', key, e.target.value)}/>)}
        </div>
      </Panel>

      <Panel>
        <SectionTitle index="07" title="Emergency & reference contacts" icon={UsersRound} description="A contact to reach in case of an accident, plus an optional employment reference."/>
        <div className="form-grid">
          <Input label="Emergency contact name *" required value={form.emergencyName} onChange={(e) => change('emergencyName', e.target.value)}/>
          <Input label="Emergency mobile *" required placeholder="+91XXXXXXXXXX" value={form.emergencyMobile} onChange={(e) => change('emergencyMobile', e.target.value)}/>
          <Input label="Relationship *" required placeholder="Spouse / parent / sibling" value={form.emergencyRelation} onChange={(e) => change('emergencyRelation', e.target.value)}/>
          <Input label="Reference person's name" value={form.referenceName} onChange={(e) => change('referenceName', e.target.value)}/>
          <Input label="Reference mobile" value={form.referenceMobile} onChange={(e) => change('referenceMobile', e.target.value)}/>
          <Input label="Background verification" as="select" value={form.backgroundCheckStatus} onChange={(e) => change('backgroundCheckStatus', e.target.value)} options={[
            {value:'NOT_STARTED', label:'Not started'}, {value:'PENDING',label:'Pending'},
            {value:'CLEARED',label:'Cleared'}, {value:'FLAGGED',label:'Flagged for review'},
          ]}/>
        </div>
        <Input label="Internal onboarding notes (optional)" as="textarea" rows={3} maxLength={2000} value={form.onboardingNote} onChange={(e) => change('onboardingNote', e.target.value)}/>
      </Panel>

      <Panel>
        <SectionTitle index="08" title="Upload driver documents" icon={Upload} description="You may upload several documents in one submission. Maximum 5 MB per document."/>
        <div className="driver-upload-progress"><span>{uploaded} of {DOC_GROUPS.length} attached</span><strong>{['photo','license','aadhaar'].every((key) => files[key]) ? 'Ready for verification review' : 'Missing required documents? Driver can upload later.'}</strong></div>
        <div className="driver-document-grid">{DOC_GROUPS.map((document) => <DocumentInput key={document.key} document={document} file={files[document.key]} onChange={selectedFile}/>)}</div>
        <p className="driver-hint">Never enter the full Aadhaar number. Where Aadhaar scans are collected, use masked copies and follow applicable privacy and verification requirements.</p>
      </Panel>
      <div className="driver-footer-actions"><Link className="btn secondary" to="/drivers">Cancel</Link><Button type="submit" loading={busy}><Plus size={18}/> Create driver and save documents</Button></div>
    </form>
  </div>;
}
