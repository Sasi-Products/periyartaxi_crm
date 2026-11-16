import { useEffect, useMemo, useState } from 'react';
import { api, currency } from '../lib/api.js';
import { Heading, Panel, Input, Button, Notice, useNotice, DataTable, Status } from '../components/UI.jsx';
import { Save, Plus, Pencil, RotateCcw, Calculator, Info } from 'lucide-react';

const SERVICES = [
  ['LOCAL', 'Local Trips'], ['LOCAL_PACKAGE', 'Local Package Boundaries'], ['OUTSTATION', 'Outstation'],
  ['DRIVER_RENT', 'Driver for Rent'], ['VALET', 'Valet Parking'],
];
const DEFAULTS = {
  LOCAL: { baseKm: 3, baseFare: 100, extraKm: 21, boundaryFee: 70, graceKm: 3, convertAfterKm: 3, waitingPerMinute: 0, waitingGraceMinutes: 0 },
  LOCAL_PACKAGE: { boundaryFee: 70, graceKm: 3, convertAfterKm: 3 },
  OUTSTATION: { shortThresholdKm: 100, minFare: 450, includedKm: 30, perKm: 13, shortIncludedHours: 3, longIncludedHours: 5, extraHour: 80, oneWayDistanceMultiplier: 1, roundTripDistanceMultiplier: 2 },
  DRIVER_RENT: { minimumHours: 6, minimumFare: 700, extraHour: 55 },
  VALET: { minimumHours: 4, perDriverBaseFare: 0, extraHourPerDriver: 0, maxDrivers: 30 },
};
const FIELDS = {
  LOCAL: [
    ['baseKm', 'Minimum included KM', 'Number of kilometres covered by the base fare'],
    ['baseFare', 'Fare for initial kilometres (₹)', 'Example: first 3 km = ₹100'],
    ['extraKm', 'Extra kilometre (₹/km)', 'Example: ₹21 per km above 3 km'],
    ['boundaryFee', 'Empty / boundary charge (₹)', 'Additional charge for allowed boundary crossing'],
    ['graceKm', 'Outside boundary charge distance (km)', 'Maximum beyond-boundary km eligible for the empty charge'],
    ['convertAfterKm', 'Auto Outstation conversion beyond (km)', 'If driven farther outside the boundary, use Outstation fare'],
    ['waitingPerMinute', 'Approved passenger waiting (₹/minute)', 'Only separately approved passenger stops; 0 disables additional waiting fare'],
    ['waitingGraceMinutes', 'Free waiting minutes', 'Grace minutes across approved passenger stops in the ride'],
  ],
  LOCAL_PACKAGE: [
    ['boundaryFee', 'Empty / boundary charge (₹)', 'Applies to package journeys within the permitted boundary grace'],
    ['graceKm', 'Outside boundary grace (km)', 'Up to this outside distance, the empty charge may apply'],
    ['convertAfterKm', 'Auto Outstation conversion beyond (km)', 'Outside distance above this converts the local package trip'],
  ],
  OUTSTATION: [
    ['shortThresholdKm', 'Distance threshold (km)', 'Below 100 km uses minimum-fare pricing; 100 km and above uses per-km pricing'],
    ['minFare', 'Minimum fare below threshold (₹)', 'Example: ₹450 for the first 30 km'],
    ['includedKm', 'KM included in minimum fare', 'Example: 30 km'],
    ['perKm', 'Additional / long-distance rate (₹/km)', 'Example: ₹13/km'],
    ['shortIncludedHours', 'Included hours below threshold', 'Example: 3 hours'],
    ['longIncludedHours', 'Included hours at/above threshold', 'Example: 5 hours'],
    ['extraHour', 'Extra hour charge (₹/hour)', 'Example: ₹80/hour'],
    ['oneWayDistanceMultiplier', 'One-way billable-distance multiplier', '1 = actual route KM'],
    ['roundTripDistanceMultiplier', 'Round-trip billable-distance multiplier', '2 = route distance × 2'],
  ],
  DRIVER_RENT: [
    ['minimumHours', 'Minimum booking hours', 'Example: 6 hours'],
    ['minimumFare', 'Minimum driver charge (₹)', 'Example: ₹700 for 6 hours'],
    ['extraHour', 'Extra hour charge (₹/hour)', 'Example: ₹55 per additional hour'],
  ],
  VALET: [
    ['minimumHours', 'Included hours per valet driver', 'Example: 4 hours'],
    ['perDriverBaseFare', 'Base charge per driver (₹)', 'Multiply by the selected number of drivers'],
    ['extraHourPerDriver', 'Extra hour per driver (₹)', 'Additional hourly charge for each requested valet driver'],
    ['maxDrivers', 'Maximum drivers per booking', 'For safety and staffing control'],
  ],
};
const newPackage = () => ({ name: '2 Hours / 20 KM', hours: 2, kms: 20, baseFare: 420, extraHour: 90, extraKm: 21, active: true });
function normalize(value) {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function describeExample(service, c) {
  if (service === 'LOCAL') return `Example 8 km = ₹${(Number(c.baseFare) + Math.max(0, 8 - Number(c.baseKm)) * Number(c.extraKm)).toLocaleString('en-IN')}. Add ₹${c.boundaryFee} if boundary charge applies.`;
  if (service === 'OUTSTATION') return `Below ${c.shortThresholdKm} km: ₹${c.minFare} covers ${c.includedKm} km, then ₹${c.perKm}/km. At/above ${c.shortThresholdKm} km: ₹${c.perKm}/billable km. One-way/round-trip use their own distance multipliers.`;
  if (service === 'DRIVER_RENT') return `${c.minimumHours} hours cost ₹${c.minimumFare}; extra hours cost ₹${c.extraHour}/hour. Customer supplies the vehicle.`;
  if (service === 'VALET') return `Valet is billed per driver: ₹${c.perDriverBaseFare} for ${c.minimumHours} hours, plus ₹${c.extraHourPerDriver} for every extra hour per driver.`;
  return 'These boundary conditions apply to local package trips. Package hours, kilometres and fares are maintained separately below.';
}
export default function Pricing() {
  const note = useNotice();
  const [branches, setBranches] = useState([]); const [branchId, setBranchId] = useState('');
  const [service, setService] = useState('LOCAL'); const [rules, setRules] = useState({});
  const [drafts, setDrafts] = useState({}); const [packages, setPackages] = useState([]);
  const [pkg, setPkg] = useState(newPackage); const [editId, setEditId] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/branches').then(({ data }) => { setBranches(data || []); setBranchId(String(data?.[0]?.id || '')); }).catch(note.error); }, []);
  const load = async (bId = branchId) => {
    if (!bId) return;
    try {
      const [pricing, local] = await Promise.all([api.get('/pricing', { params: { branchId: bId } }), api.get('/pricing/packages', { params: { branchId: bId } })]);
      setRules(Object.fromEntries((pricing.data || []).map(item => [item.service, normalize(item.config)])));
      setPackages(Array.isArray(local.data) ? local.data : []);
    } catch (e) { note.error(e); }
  };
  useEffect(() => { setDrafts({}); setEditId(null); setPkg(newPackage()); load(branchId); }, [branchId]);
  const draftKey = `${branchId}:${service}`;
  const current = useMemo(() => ({ ...DEFAULTS[service], ...normalize(rules[service]), ...normalize(drafts[draftKey]) }), [service, rules, drafts, draftKey]);
  const change = (key, value) => setDrafts(p => ({ ...p, [draftKey]: { ...p[draftKey], [key]: Number(value) } }));
  async function save() {
    if (!branchId) return note.error('Select a branch');
    if (service === 'OUTSTATION' && current.shortThresholdKm <= current.includedKm) return note.error('Distance threshold must exceed included KM');
    if (service === 'VALET' && !current.perDriverBaseFare) return note.error('Enter a base fare per valet driver');
    setBusy(true); note.clear();
    try {
      await api.put('/pricing', { branchId: Number(branchId), service, config: current });
      note.success(`${SERVICES.find(([k]) => k === service)?.[1]} pricing saved for ${branches.find(b => String(b.id) === branchId)?.name || 'branch'}`);
      setDrafts(p => { const next = { ...p }; delete next[draftKey]; return next; });
      await load();
    } catch (e) { note.error(e); } finally { setBusy(false); }
  }
  async function savePackage() {
    if (!branchId) return note.error('Select a branch');
    setBusy(true); note.clear();
    try {
      const data = { ...pkg, branchId: Number(branchId), hours: Number(pkg.hours), kms: Number(pkg.kms), baseFare: Number(pkg.baseFare), extraHour: Number(pkg.extraHour), extraKm: Number(pkg.extraKm) };
      if (editId) await api.patch(`/pricing/packages/${editId}`, data); else await api.post('/pricing/packages', data);
      note.success('Package saved'); setEditId(null); setPkg(newPackage()); await load();
    } catch (e) { note.error(e); } finally { setBusy(false); }
  }
  function suggestPackage() {
    const sorted = [...packages].filter(p => p.active).sort((a,b) => Number(a.hours)-Number(b.hours));
    const base = sorted.at(-1) || pkg;
    const hours = Number(base.hours) + 1; const kms = Number(base.kms) + 10;
    const amount = Number(base.baseFare) + Number(base.extraHour) + 10 * Number(base.extraKm);
    setEditId(null); setPkg({ name: `${hours} Hours / ${kms} KM`, hours, kms, baseFare: amount, extraHour: Number(base.extraHour), extraKm: Number(base.extraKm), active: true });
  }
  return <>
    <Heading title="Dynamic fares & packages" sub="Define each of the five Periyar Taxi services independently for each branch."/>
    <Notice state={note}/>
    <Panel title="Fare configuration" sub="Only new fare quotations use updated rates. Existing ride quotations preserve their saved pricing snapshot.">
      <div className="form-grid">
        <Input label="Branch" as="select" value={branchId} onChange={e => setBranchId(e.target.value)} options={branches.map(b => ({ value: b.id, label: b.name }))}/>
        <Input label="Service" as="select" value={service} onChange={e => setService(e.target.value)} options={SERVICES.map(([value, label]) => ({ value, label }))}/>
      </div>
      <div className="fare-service-header"><Calculator size={19}/><div><strong>{SERVICES.find(([key]) => key === service)?.[1]} pricing</strong><p>{service === 'LOCAL_PACKAGE' ? 'Configure the local boundary policy here; manage actual packages below.' : 'All pricing values are editable and saved against the selected branch.'}</p></div></div>
      <div className="form-grid pricing-fields">
        {FIELDS[service].map(([key, label, help]) => <Input key={key} label={label} help={help} type="number" min="0" step={['baseKm', 'includedKm', 'shortThresholdKm', 'maxDrivers'].includes(key) ? '1' : 'any'} value={current[key] ?? 0} onChange={e => change(key, e.target.value)} required/>)}
      </div>
      <div className="fare-example"><Info size={18}/><span>{describeExample(service, current)}</span></div>
      <div className="form-actions"><Button loading={busy} onClick={save}><Save size={16}/> Save {SERVICES.find(([key]) => key === service)?.[1]} rates</Button>
        <Button kind="secondary" onClick={() => setDrafts(p => { const next = { ...p }; delete next[draftKey]; return next; })}><RotateCcw size={15}/> Discard unsaved changes</Button>
      </div>
    </Panel>
    {service === 'LOCAL_PACKAGE' && <Panel title="Local package catalogue" sub="Package fares are independent of service boundaries. Define hours, kilometres, minimum fare and additional rates.">
      <div className="notice info">Example: 2 hrs / 20 km = ₹420. Next 3 hrs / 30 km = ₹420 + ₹90 (extra hour) + ₹210 (10 extra km) = ₹720.</div>
      <div className="form-grid">
        <Input label="Package name" required value={pkg.name || ''} onChange={e => setPkg(p => ({ ...p, name: e.target.value }))}/>
        {[
          ['hours', 'Included hours'], ['kms', 'Included kilometres'], ['baseFare', 'Minimum/package fare (₹)'], ['extraHour', 'Extra hour (₹/hour)'], ['extraKm', 'Extra kilometre (₹/km)'],
        ].map(([key, label]) => <Input key={key} label={label} type="number" min="0" step="any" value={pkg[key] ?? 0} onChange={e => setPkg(p => ({ ...p, [key]: Number(e.target.value) }))}/>)}
        <Input label="Package status" as="select" value={pkg.active ? 'ACTIVE' : 'INACTIVE'} onChange={e => setPkg(p => ({ ...p, active: e.target.value === 'ACTIVE' }))} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}/>
      </div>
      <div className="form-actions"><Button loading={busy} onClick={savePackage}><Save size={16}/>{editId ? 'Update package' : 'Add new package'}</Button>
        <Button kind="secondary" onClick={suggestPackage}><Calculator size={16}/> Suggest next +1 hr / +10 km package</Button>
        {editId && <Button kind="ghost" onClick={() => { setEditId(null); setPkg(newPackage()); }}>Cancel edit</Button>}
      </div>
      <DataTable headers={['Package','Hours','KM','Base fare','Extra hour','Extra KM','Status','']} rows={packages}
        render={p => <><td><strong>{p.name}</strong></td><td>{p.hours} hrs</td><td>{p.kms} km</td><td>{currency(p.baseFare)}</td><td>{currency(p.extraHour)}</td><td>{currency(p.extraKm)}</td><td><Status value={p.active ? 'ACTIVE' : 'INACTIVE'}/></td><td><button className="icon-btn" type="button" onClick={() => { setPkg({ ...p }); setEditId(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16}/></button></td></>}/>
    </Panel>}
  </>;
}
