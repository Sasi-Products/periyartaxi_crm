import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Upload, CheckCircle2, Wrench, Gauge, FileText, Camera, Video, ShieldCheck, Plus } from 'lucide-react';
import { api, currency, dateTime } from '../lib/api.js';
import { Heading, Panel, Button, Input, Notice, useNotice, Status, DataTable } from '../components/UI.jsx';
import ProtectedFile from '../components/ProtectedFile.jsx';

const MEDIA = {
  photos: [['front', 'Front'], ['back', 'Back'], ['left', 'Left side'], ['right', 'Right side'], ['interior1', 'Interior front'], ['interior2', 'Interior back']],
  videos: [['walkaround', 'Exterior walkaround'], ['interior', 'Interior'], ['engine', 'Engine / inspection']],
  documents: [['rc', 'RC certificate'], ['insurance', 'Insurance'], ['permit', 'Permit'], ['pollution', 'Pollution / PUC'], ['fitness', 'Fitness certificate'], ['roadTax', 'Road tax'], ['ownerKyc', 'Attached owner proof'], ['attachmentAgreement', 'Signed attachment agreement'], ['ownerConsent', 'Owner consent'], ['purchaseInvoice', 'Purchase invoice'], ['serviceInvoice', 'Latest service invoice']],
};
const dateToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const serviceInitial = () => ({ serviceDate: dateToday(), category: 'GENERAL_SERVICE', description: '', workshop: '', odometerKm: '', partsCost: 0, labourCost: 0, nextServiceKm: '', nextServiceDate: '', addToExpenses: true });
const readingInitial = () => ({ readingKm: '', note: '' });
const serviceCategories = ['GENERAL_SERVICE', 'OIL_CHANGE', 'TYRE', 'BRAKE', 'AC', 'ENGINE', 'TRANSMISSION', 'BATTERY', 'INSPECTION', 'ACCIDENT_REPAIR', 'OTHER'];

export default function VehicleDetails() {
  const { id } = useParams(); const note = useNotice();
  const [vehicle, setVehicle] = useState(null);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [odometerHistory, setOdometerHistory] = useState([]);
  const [tab, setTab] = useState('media');
  const [uploading, setUploading] = useState(''); const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(readingInitial);
  const [service, setService] = useState(serviceInitial);
  const load = useCallback(async () => {
    try {
      const [v, s, o] = await Promise.all([api.get(`/vehicles/${id}`), api.get(`/vehicles/${id}/services`), api.get(`/vehicles/${id}/odometer`)]);
      setVehicle(v.data); setServiceHistory(s.data); setOdometerHistory(o.data);
    } catch (e) { note.error(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  async function upload(group, key, file) {
    if (!file) return;
    setUploading(`${group}-${key}`); note.clear();
    try {
      const data = new FormData(); data.append('file', file);
      await api.post(`/vehicles/${id}/media/${group}/${key}`, data);
      note.success('File saved privately. Reverify the vehicle after changing certificates.');
      await load();
    } catch (e) { note.error(e); }
    finally { setUploading(''); }
  }
  async function uploadServiceInvoice(logId, file) {
    if (!file) return;
    setUploading(`invoice-${logId}`);
    try {
      const data = new FormData(); data.append('file', file);
      await api.post(`/vehicles/${id}/services/${logId}/invoice`, data);
      note.success('Service invoice uploaded privately'); await load();
    } catch (e) { note.error(e); } finally { setUploading(''); }
  }
  async function verify(approved) {
    if (approved && !window.confirm('Approve this vehicle for trip assignment after reviewing the uploaded documents?')) return;
    setBusy(true);
    try { await api.post(`/vehicles/${id}/verify`, { approved }); note.success(approved ? 'Vehicle approved' : 'Vehicle rejected'); await load(); }
    catch (e) { note.error(e); } finally { setBusy(false); }
  }
  async function logReading(e) {
    e.preventDefault(); setBusy(true);
    try { await api.post(`/vehicles/${id}/odometer`, { ...reading, readingKm: Number(reading.readingKm) }); setReading(readingInitial()); note.success('Odometer reading recorded'); await load(); }
    catch (e) { note.error(e); } finally { setBusy(false); }
  }
  async function logService(e) {
    e.preventDefault(); setBusy(true);
    try {
      await api.post(`/vehicles/${id}/services`, {
        ...service, partsCost: Number(service.partsCost || 0), labourCost: Number(service.labourCost || 0),
        odometerKm: service.odometerKm === '' ? null : Number(service.odometerKm),
        nextServiceKm: service.nextServiceKm === '' ? null : Number(service.nextServiceKm),
      });
      setService(serviceInitial()); note.success('Service history recorded'); await load();
    } catch (e) { note.error(e); } finally { setBusy(false); }
  }
  if (!vehicle) return <><Heading title="Vehicle details" sub="Loading fleet record..."/><Notice state={note}/></>;
  const due = (vehicle.serviceDueKm != null && Number(vehicle.odometerKm || 0) >= Number(vehicle.serviceDueKm)) || (vehicle.serviceDueDate && vehicle.serviceDueDate < dateToday());
  return <div className="fleet-details-page">
    <Heading title={`${vehicle.registration} · ${vehicle.brand || ''} ${vehicle.name || ''}`} sub={`${vehicle.ownershipType === 'ATTACHED' ? 'Attached vehicle' : 'Company-owned vehicle'} · ${vehicle.type} · ${vehicle.seats || '?'} seats`}
      action={<div className="fleet-actions"><Link className="btn secondary" to="/vehicles"><ArrowLeft size={15}/> Fleet</Link><Link className="btn primary" to={`/vehicles/${id}/edit`}><Pencil size={15}/> Edit vehicle</Link></div>}/>
    <Notice state={note}/>
    <div className="fleet-stats">
      <div><Gauge size={22}/><span>Current running KM</span><strong>{Number(vehicle.odometerKm || 0).toLocaleString('en-IN')} km</strong></div>
      <div><ShieldCheck size={22}/><span>Verification</span><strong><Status value={vehicle.verification}/></strong></div>
      <div><Wrench size={22}/><span>Service due</span><strong>{due ? 'Attention needed' : vehicle.serviceDueKm ? `${Number(vehicle.serviceDueKm).toLocaleString('en-IN')} km` : vehicle.serviceDueDate || 'Not scheduled'}</strong></div>
    </div>
    <Panel title="Owner and certificate snapshot" sub="Documents and expiry dates are tracked separately from the attached owner's commercial terms.">
      <div className="fleet-facts">
        <div><span>Owner type</span><strong>{vehicle.ownershipType === 'ATTACHED' ? 'Attached' : 'Company'}</strong></div>
        <div><span>Vehicle status</span><Status value={vehicle.vehicleStatus || 'AVAILABLE'}/></div>
        <div><span>Insurance expiry</span><strong>{vehicle.insuranceExpiry || 'Not set'}</strong></div>
        <div><span>Permit expiry</span><strong>{vehicle.permitExpiry || 'Not set'}</strong></div>
        <div><span>PUC expiry</span><strong>{vehicle.pollutionExpiry || 'Not set'}</strong></div>
        <div><span>Fitness expiry</span><strong>{vehicle.fitnessExpiry || 'Not set'}</strong></div>
        {vehicle.ownershipType === 'ATTACHED' && <>
          <div><span>Attached owner</span><strong>{vehicle.ownerDetails?.name || '—'}</strong></div>
          <div><span>Owner mobile</span><strong>{vehicle.ownerDetails?.mobile || '—'}</strong></div>
          <div><span>Agreement dates</span><strong>{vehicle.attachmentTerms?.startDate || '—'} / {vehicle.attachmentTerms?.endDate || 'Ongoing'}</strong></div>
          <div><span>Settlement</span><strong>{vehicle.attachmentTerms?.settlementType || '—'} · {vehicle.attachmentTerms?.settlementRate || 0}</strong></div>
        </>}
      </div>
    </Panel>
    <nav className="fleet-tabs" aria-label="Vehicle record sections">
      {[
        ['media', 'Photos, videos & documents', Camera], ['service', 'Service history', Wrench], ['odometer', 'Running KM history', Gauge]
      ].map(([value, label, Icon]) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon size={16}/>{label}</button>)}
    </nav>
    {tab === 'media' && <>
      {Object.entries(MEDIA).map(([group, fields]) => <Panel key={group} title={group === 'photos' ? 'Six mandatory vehicle images' : group === 'videos' ? 'Vehicle inspection videos' : 'Vehicle certificates & agreements'} sub={group === 'photos' ? 'Front, rear, two sides, and two interior images.' : group === 'videos' ? 'MP4/WebM videos (maximum 25 MB each).' : 'RC, insurance, permit and pollution certificates are mandatory for approval.'}>
        <div className="fleet-media-grid">
          {fields.map(([key, label]) => {
            const value = vehicle[group]?.[key]; const uploadingThis = uploading === `${group}-${key}`;
            return <div className={`fleet-media-card ${value ? 'is-uploaded' : ''}`} key={`${group}-${key}`}>
              {group === 'videos' ? <Video size={22}/> : group === 'photos' ? <Camera size={22}/> : <FileText size={22}/>}
              <strong>{label}</strong><small>{value ? 'Uploaded' : 'Not uploaded'}</small>
              {value && <ProtectedFile path={String(value).startsWith('/api/') ? value : `/api/vehicles/${id}/media/${group}/${key}`} label="View file" />}
              <label className="btn secondary"><Upload size={14}/>{uploadingThis ? 'Uploading...' : value ? 'Replace' : 'Upload'}
                <input type="file" disabled={!!uploading} accept={group === 'videos' ? 'video/mp4,video/webm' : group === 'photos' ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,application/pdf'} onChange={e => { upload(group, key, e.target.files?.[0]); e.target.value = ''; }}/>
              </label>
            </div>;
          })}
        </div>
      </Panel>)}
      <Panel title="Verification" sub="Only approved and available vehicles can be allocated for automatic dispatch.">
        <div className="form-actions"><Button loading={busy} onClick={() => verify(true)}><CheckCircle2 size={17}/> Approve vehicle</Button><Button kind="danger-outline" loading={busy} onClick={() => verify(false)}>Reject / suspend approval</Button></div>
      </Panel>
    </>}
    {tab === 'odometer' && <>
      <Panel title="Record new odometer reading" sub="Running KM cannot decrease. This prevents accidental rewriting of the vehicle history.">
        <form className="form-grid" onSubmit={logReading}>
          <Input label="Reading (KM)" type="number" step="0.1" min={vehicle.odometerKm || 0} required value={reading.readingKm} onChange={e => setReading(p => ({ ...p, readingKm: e.target.value }))}/>
          <Input label="Note / inspection reference" value={reading.note} onChange={e => setReading(p => ({ ...p, note: e.target.value }))}/>
          <div className="full"><Button loading={busy} type="submit"><Plus size={16}/> Save odometer reading</Button></div>
        </form>
      </Panel>
      <Panel title="Running kilometre history">
        <DataTable headers={['Reading', 'Date / Time', 'Source', 'Notes']} rows={odometerHistory}
          render={o => <><td><strong>{Number(o.readingKm).toLocaleString('en-IN')} km</strong></td><td>{dateTime(o.readingAt)}</td><td><Status value={o.source}/></td><td>{o.note || '—'}</td></>}/>
      </Panel>
    </>}
    {tab === 'service' && <>
      <Panel title="Add service / repair record" sub="Record oil changes, tyres, AC, repairs, inspection and next service schedule.">
        <form onSubmit={logService} className="form-grid">
          <Input label="Date of service" required type="date" value={service.serviceDate} max={dateToday()} onChange={e => setService(p => ({ ...p, serviceDate: e.target.value }))}/>
          <Input label="Service type" as="select" value={service.category} onChange={e => setService(p => ({ ...p, category: e.target.value }))} options={serviceCategories.map(k => ({ value: k, label: k.replaceAll('_', ' ') }))}/>
          <Input label="Workshop / mechanic" value={service.workshop} onChange={e => setService(p => ({ ...p, workshop: e.target.value }))}/>
          <Input label="Odometer at service" type="number" min="0" step="0.1" value={service.odometerKm} onChange={e => setService(p => ({ ...p, odometerKm: e.target.value }))}/>
          <Input label="Parts cost (₹)" type="number" min="0" step="0.01" value={service.partsCost} onChange={e => setService(p => ({ ...p, partsCost: e.target.value }))}/>
          <Input label="Labour cost (₹)" type="number" min="0" step="0.01" value={service.labourCost} onChange={e => setService(p => ({ ...p, labourCost: e.target.value }))}/>
          <Input label="Next service KM" type="number" min="0" value={service.nextServiceKm} onChange={e => setService(p => ({ ...p, nextServiceKm: e.target.value }))}/>
          <Input label="Next service date" type="date" value={service.nextServiceDate} onChange={e => setService(p => ({ ...p, nextServiceDate: e.target.value }))}/>
          <div className="full"><Input label="Work done / parts replaced" required as="textarea" value={service.description} onChange={e => setService(p => ({ ...p, description: e.target.value }))}/></div>
          <label className="fleet-checkbox full"><input type="checkbox" checked={service.addToExpenses} onChange={e => setService(p => ({ ...p, addToExpenses: e.target.checked }))}/> Record ₹{Number(service.partsCost || 0) + Number(service.labourCost || 0)} in branch expenses</label>
          <div className="full"><Button type="submit" loading={busy}><Plus size={16}/> Save service record</Button></div>
        </form>
      </Panel>
      <Panel title="Service and repair history">
        <DataTable headers={['Date', 'Type', 'Workshop', 'KM', 'Cost', 'Next due', 'Expense', 'Invoice']} rows={serviceHistory}
          render={s => <><td>{s.serviceDate}</td><td><strong>{s.category.replaceAll('_', ' ')}</strong><small className="block muted">{s.description}</small></td><td>{s.workshop || '—'}</td><td>{s.odometerKm == null ? '—' : `${Number(s.odometerKm).toLocaleString('en-IN')} km`}</td><td>{currency(s.totalCost)}</td><td>{s.nextServiceKm ? `${s.nextServiceKm} km` : s.nextServiceDate || '—'}</td><td>{s.expenseId ? 'Expense linked' : 'Not linked'}</td><td>{s.invoiceDocument && <ProtectedFile path={`/api/vehicles/${id}/services/${s.id}/invoice`} label="Invoice"/>}<label className="fleet-upload-invoice"><Upload size={13}/>{uploading === `invoice-${s.id}` ? 'Uploading' : s.invoiceDocument ? 'Replace' : 'Add invoice'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={!!uploading} onChange={e => { uploadServiceInvoice(s.id, e.target.files?.[0]); e.target.value=''; }}/></label></td></>}/>
      </Panel>
    </>}
  </div>;
}
