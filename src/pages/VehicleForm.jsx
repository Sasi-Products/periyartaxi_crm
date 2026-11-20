import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck, UserRound, CarFront, CalendarDays } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Heading, Panel, Input, Button, Notice, useNotice } from '../components/UI.jsx';

const newForm = () => ({
  branchId: '', registration: '', brand: '', name: '', variant: '', modelYear: new Date().getFullYear(),
  fuelType: 'Petrol', seats: 5, type: 'SEDAN', ownershipType: 'COMPANY',
  chassisLast6: '', engineLast6: '', registrationDate: '', insuranceProvider: '', policyNumber: '',
  insuranceExpiry: '', pollutionExpiry: '', permitExpiry: '', fitnessExpiry: '', roadTaxExpiry: '',
  odometerKm: 0, serviceDueKm: '', serviceDueDate: '', vehicleStatus: 'AVAILABLE', notes: '',
  ownerDetails: { name: '', mobile: '', alternateMobile: '', address: '', city: '', state: 'Tamil Nadu', pincode: '', relation: '' },
  attachmentTerms: { startDate: '', endDate: '', settlementType: 'PER_TRIP', settlementRate: 0, notes: '' },
});
const types = ['MINI', 'SEDAN', 'SUV', 'SUV_PLUS', 'TEMPO_TRAVELLER', 'COACH_VAN', 'MINI_BUS', 'BUS', 'URBANIA'];
const fuels = ['Petrol', 'Diesel', 'CNG', 'Petrol + CNG', 'Petrol + Electric', 'Electric', 'Hybrid'];
const dateProps = ['registrationDate', 'insuranceExpiry', 'pollutionExpiry', 'permitExpiry', 'fitnessExpiry', 'roadTaxExpiry', 'serviceDueDate'];
function Section({ number, title, sub, children }) { return <Panel><div className="fleet-section"><span>{number}</span><div><h3>{title}</h3><p>{sub}</p></div></div>{children}</Panel>; }

export default function VehicleForm() {
  const { id } = useParams(); const editing = !!id;
  const navigate = useNavigate(); const { user } = useAuth(); const note = useNotice();
  const [form, setForm] = useState(newForm); const [branches, setBranches] = useState([]); const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get('/branches').then(({ data }) => {
      setBranches(data);
      setForm(p => ({ ...p, branchId: p.branchId || String(user?.branchId || data[0]?.id || '') }));
    }).catch(note.error);
    if (editing) api.get(`/vehicles/${id}`).then(({ data }) => setForm(p => ({ ...p, ...data, ownerDetails: { ...p.ownerDetails, ...(data.ownerDetails || {}) }, attachmentTerms: { ...p.attachmentTerms, ...(data.attachmentTerms || {}) } }))).catch(note.error);
  }, [id, editing, user?.branchId]);
  const change = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const nested = (group, key, value) => setForm(p => ({ ...p, [group]: { ...p[group], [key]: value } }));
  async function submit(e) {
    e.preventDefault(); note.clear(); setBusy(true);
    try {
      const payload = { ...form, branchId: Number(form.branchId), modelYear: Number(form.modelYear), seats: Number(form.seats) };
      // Running KM is recorded separately after registration to preserve its audit history.
      if (editing) delete payload.odometerKm;
      else payload.odometerKm = Number(form.odometerKm || 0);
      const result = editing ? await api.patch(`/vehicles/${id}`, payload) : await api.post('/vehicles', payload);
      navigate(`/vehicles/${result.data.id}`);
    } catch (error) { note.error(error); }
    finally { setBusy(false); }
  }
  return <div className="fleet-form-page">
    <Heading title={editing ? 'Edit vehicle' : 'Register a new vehicle'} sub="Complete the vehicle profile. Add certificates, photos, videos, and service history from its detailed record."
      action={<Link className="btn secondary" to={editing ? `/vehicles/${id}` : '/vehicles'}><ArrowLeft size={16}/> Back to fleet</Link>}/>
    <Notice state={note}/>
    <form onSubmit={submit}>
      <Section number="01" title="Vehicle category & ownership" sub="Choose whether this vehicle belongs to Periyar Taxi or an external attached owner.">
        <div className="form-grid">
          <Input label="Branch" as="select" value={form.branchId} disabled={editing} required onChange={e => change('branchId', e.target.value)} options={branches.map(b => ({ value: b.id, label: b.name }))}/>
          <Input label="Ownership" as="select" value={form.ownershipType} onChange={e => change('ownershipType', e.target.value)} options={[{ value: 'COMPANY', label: 'Company-owned vehicle' }, { value: 'ATTACHED', label: 'Attached vehicle (external owner)' }]}/>
          <Input label="Registration number" required value={form.registration || ''} disabled={editing} onChange={e => change('registration', e.target.value.toUpperCase())} placeholder="TN 33 AB 1234"/>
          <Input label="Category" as="select" value={form.type} onChange={e => change('type', e.target.value)} options={types.map(v => ({ value: v, label: v.replaceAll('_', ' ') }))}/>
          <Input label="Vehicle brand" required value={form.brand || ''} onChange={e => change('brand', e.target.value)} placeholder="Maruti Suzuki"/>
          <Input label="Vehicle name" required value={form.name || ''} onChange={e => change('name', e.target.value)} placeholder="Dzire"/>
          <Input label="Variant" value={form.variant || ''} onChange={e => change('variant', e.target.value)}/>
          <Input label="Model year" required type="number" min="1980" max={new Date().getFullYear() + 1} value={form.modelYear || ''} onChange={e => change('modelYear', e.target.value)}/>
          <Input label="Fuel type" as="select" value={form.fuelType || 'Petrol'} onChange={e => change('fuelType', e.target.value)} options={fuels.map(v => ({ value: v, label: v }))}/>
          <Input label="Seating capacity (including driver)" required type="number" min="2" max="80" value={form.seats ?? 5} onChange={e => change('seats', e.target.value)}/>
          <Input label="Vehicle availability" as="select" value={form.vehicleStatus || 'AVAILABLE'} onChange={e => change('vehicleStatus', e.target.value)} options={[{ value: 'AVAILABLE', label: 'Available once verified' }, { value: 'MAINTENANCE', label: 'Under maintenance' }, { value: 'RETIRED', label: 'Retired' }]}/>
          {!editing && <Input label="Current odometer (km)" type="number" min="0" step="0.1" value={form.odometerKm || 0} onChange={e => change('odometerKm', e.target.value)}/>}
        </div>
      </Section>
      {form.ownershipType === 'ATTACHED' && <Section number="02" title="Attached owner & commercial agreement" sub="The owner contact and agreement start date are mandatory for attached vehicles.">
        <div className="form-grid">
          {[
            ['name', 'Owner full name', true], ['mobile', 'Owner mobile', true], ['alternateMobile', 'Alternate mobile'],
            ['address', 'Permanent address', true], ['city', 'City'], ['state', 'State'], ['pincode', 'PIN code'], ['relation', 'Owner relation / contact'],
          ].map(([k, label, required]) => <Input key={k} label={label} required={required} value={form.ownerDetails?.[k] || ''} onChange={e => nested('ownerDetails', k, e.target.value)}/>)}
          <Input label="Agreement start" required type="date" value={form.attachmentTerms?.startDate || ''} onChange={e => nested('attachmentTerms', 'startDate', e.target.value)}/>
          <Input label="Agreement end" type="date" value={form.attachmentTerms?.endDate || ''} onChange={e => nested('attachmentTerms', 'endDate', e.target.value)}/>
          <Input label="Owner settlement basis" as="select" value={form.attachmentTerms?.settlementType || 'PER_TRIP'} onChange={e => nested('attachmentTerms', 'settlementType', e.target.value)} options={[
            { value: 'PER_TRIP', label: 'Per trip amount' }, { value: 'DAILY', label: 'Per day' },
            { value: 'MONTHLY', label: 'Monthly' }, { value: 'PERCENTAGE', label: 'Percentage of fare' },
          ]}/>
          <Input label="Settlement rate (₹ or %)" type="number" min="0" step="0.01" value={form.attachmentTerms?.settlementRate ?? 0} onChange={e => nested('attachmentTerms', 'settlementRate', e.target.value)}/>
          <div className="full"><Input label="Agreement / owner settlement notes" as="textarea" value={form.attachmentTerms?.notes || ''} onChange={e => nested('attachmentTerms', 'notes', e.target.value)}/></div>
        </div>
        <div className="notice info">Upload owner ID proof (masked), vehicle attachment agreement and owner consent from the vehicle details page.</div>
      </Section>}
      <Section number={form.ownershipType === 'ATTACHED' ? '03' : '02'} title="Registration & certificates" sub="Record expiry dates to flag upcoming renewals and avoid unsafe dispatch.">
        <div className="form-grid">
          {dateProps.map(key => <Input key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, v => v.toUpperCase())} type="date" value={form[key] || ''} onChange={e => change(key, e.target.value)}/>)}
          <Input label="Chassis number — last six only" maxLength={6} value={form.chassisLast6 || ''} onChange={e => change('chassisLast6', e.target.value.toUpperCase())}/>
          <Input label="Engine number — last six only" maxLength={6} value={form.engineLast6 || ''} onChange={e => change('engineLast6', e.target.value.toUpperCase())}/>
          <Input label="Insurance provider" value={form.insuranceProvider || ''} onChange={e => change('insuranceProvider', e.target.value)}/>
          <Input label="Insurance policy number" value={form.policyNumber || ''} onChange={e => change('policyNumber', e.target.value)}/>
          <Input label="Next service due km" type="number" min="0" step="0.1" value={form.serviceDueKm ?? ''} onChange={e => change('serviceDueKm', e.target.value)}/>
          <div className="full"><Input label="Vehicle condition / inspection notes" as="textarea" value={form.notes || ''} onChange={e => change('notes', e.target.value)}/></div>
        </div>
      </Section>
      <div className="fleet-footer"><Link className="btn secondary" to="/vehicles">Cancel</Link><Button type="submit" loading={busy}><Save size={17}/> {editing ? 'Save changes' : 'Register vehicle & continue to documents'}</Button></div>
    </form>
  </div>;
}
