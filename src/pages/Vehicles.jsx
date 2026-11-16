import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Heading, Panel, Input, Button, DataTable, Status, Notice, useNotice } from '../components/UI.jsx';
import { Plus, Search, CarFront, Wrench, FileCheck2, ArrowRight } from 'lucide-react';

export default function Vehicles() {
  const note = useNotice();
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [ownership, setOwnership] = useState('ALL');
  const [branchId, setBranchId] = useState('ALL');
  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles(Array.isArray(r.data) ? r.data : [])).catch(note.error);
    api.get('/branches').then(r => setBranches(Array.isArray(r.data) ? r.data : [])).catch(note.error);
  }, []);
  const filtered = useMemo(() => vehicles.filter(v => {
    if (ownership !== 'ALL' && (v.ownershipType || 'COMPANY') !== ownership) return false;
    if (branchId !== 'ALL' && String(v.branchId) !== branchId) return false;
    return [v.registration, v.brand, v.name, v.variant, v.ownerDetails?.name].join(' ').toLowerCase().includes(search.toLowerCase());
  }), [vehicles, branchId, ownership, search]);
  const overdue = v => (v.serviceDueKm && Number(v.odometerKm || 0) >= Number(v.serviceDueKm)) ||
    (v.serviceDueDate && v.serviceDueDate < new Date().toISOString().slice(0, 10));
  return <>
    <Heading title="Fleet & vehicle management" sub="Manage company and attached cars, documents, videos, service records, owner agreements and odometer history."
      action={<Link className="btn primary" to="/vehicles/new"><Plus size={17}/> Add vehicle</Link>} />
    <Notice state={note}/>
    <div className="fleet-stats">
      <div><CarFront size={23}/><span>Total vehicles</span><strong>{vehicles.length}</strong></div>
      <div><FileCheck2 size={23}/><span>Approved vehicles</span><strong>{vehicles.filter(v => v.verification === 'APPROVED').length}</strong></div>
      <div><Wrench size={23}/><span>Service due</span><strong>{vehicles.filter(overdue).length}</strong></div>
    </div>
    <Panel title="Vehicle directory" sub="Select a vehicle to see every document, maintenance event and running kilometre reading.">
      <div className="fleet-filters">
        <Input label="Search registration, model or owner" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles" />
        <Input label="Ownership" as="select" value={ownership} onChange={e => setOwnership(e.target.value)} options={[
          { value: 'ALL', label: 'All vehicles' }, { value: 'COMPANY', label: 'Company owned' }, { value: 'ATTACHED', label: 'Attached vehicles' }
        ]}/>
        <Input label="Branch" as="select" value={branchId} onChange={e => setBranchId(e.target.value)} options={[
          { value: 'ALL', label: 'All permitted branches' }, ...branches.map(b => ({ value: String(b.id), label: b.name }))
        ]}/>
      </div>
      <DataTable headers={['Vehicle', 'Ownership', 'Branch', 'Odometer', 'Service', 'Verification', '']} rows={filtered}
        render={v => <>
          <td><strong>{v.registration}</strong><small className="block muted">{[v.brand, v.name, v.variant].filter(Boolean).join(' ')} · {v.type}</small></td>
          <td><strong>{v.ownershipType === 'ATTACHED' ? 'Attached' : 'Company'}</strong>{v.ownershipType === 'ATTACHED' && <small className="block muted">{v.ownerDetails?.name || 'Owner not set'}</small>}</td>
          <td>{branches.find(b => Number(b.id) === Number(v.branchId))?.name || v.branchId}</td>
          <td>{Number(v.odometerKm || 0).toLocaleString('en-IN')} km</td>
          <td>{overdue(v) ? <Status value="DUE"/> : <Status value={v.vehicleStatus || 'AVAILABLE'}/>}</td>
          <td><Status value={v.verification}/></td>
          <td><Link className="btn secondary" to={`/vehicles/${v.id}`}>Open <ArrowRight size={15}/></Link></td>
        </>}/>
    </Panel>
  </>;
}
