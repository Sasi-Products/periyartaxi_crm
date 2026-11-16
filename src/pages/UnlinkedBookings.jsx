import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, History, Link2, Search } from 'lucide-react';
import { api, dateTime, currency } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heading, Panel, Input, Button, Notice, useNotice, Empty, Status } from '../components/UI';
import '../styles/customers.css';
export default function UnlinkedBookings() {
  const { can } = useAuth(); const note = useNotice();
  const [rides,setRides] = useState([]);const [total,setTotal] = useState(0);const [page,setPage] = useState(1);
  const [selectedRide,setSelectedRide] = useState(null);const [search,setSearch] = useState('');const [matches,setMatches] = useState([]);const [customerId,setCustomerId] = useState('');const [busy,setBusy] = useState(false);
  const load = useCallback(async () => { try { const { data } = await api.get('/customers/unlinked',{params:{page,pageSize:20}});setRides(data.rows||[]);setTotal(data.total||0); }catch(e){note.error(e)} },[page]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(!selectedRide)return;const timer=setTimeout(()=>{api.get('/customers',{params:{q:search,pageSize:100}}).then(r=>setMatches(r.data.rows||[])).catch(note.error)},300);return()=>clearTimeout(timer)},[selectedRide,search]);
  async function link() {
    if (!selectedRide||!customerId)return;
    const customer=matches.find(x=>String(x.id)===customerId);
    if (!window.confirm(`Link booking PT-${selectedRide.id} to ${customer?.name||'this customer'}? Verify the passenger identity before continuing.`))return;
    setBusy(true);
    try { await api.post(`/customers/${customerId}/link-ride`,{rideId:selectedRide.id});note.success('Booking linked to customer history');setSelectedRide(null);setCustomerId('');setSearch('');load(); }
    catch(e){note.error(e)} finally{setBusy(false)}
  }
  return <>
    <Heading title="Unlinked counter bookings" sub="Older admin bookings without a customer ID. Link them manually after confirming the passenger's identity." action={<Link className="btn secondary" to="/customers"><ArrowLeft size={17}/> Customers</Link>}/>
    <Notice state={note}/>
    <div className="customer-hint warning"><AlertTriangle size={19}/> These are legacy bookings. We deliberately do not merge customers automatically by matching names or phone numbers.</div>
    <Panel title="Legacy ride list"><div className="table-wrap"><table><thead><tr><th>Booking</th><th>Passenger</th><th>Service</th><th>Schedule</th><th>Status</th><th>Action</th></tr></thead><tbody>{rides.map(r=><tr key={r.id}><td><strong>PT-{String(r.id).padStart(5,'0')}</strong></td><td><strong>{r.guestName||'Unnamed walk-in'}</strong><small className="block muted">{r.guestMobile||'No phone'}</small></td><td>{r.service.replaceAll('_',' ')}</td><td>{dateTime(r.scheduledAt)}</td><td><Status value={r.status}/></td><td>{can('customers.manage') ? <Button kind="secondary" onClick={()=>{setSelectedRide(r);setSearch(r.guestMobile||r.guestName||'');setCustomerId('')}}><Link2 size={16}/> Link customer</Button> : <Link to={`/trips/${r.id}`} className="btn secondary">View trip</Link>}</td></tr>)}</tbody></table>{!rides.length&&<Empty title="No unlinked bookings" sub="All counter bookings have customer records."/>}</div><div className="customer-pagination"><span>{total} bookings</span><div><Button kind="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {page}</span><Button kind="secondary" disabled={page*20>=total} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div></Panel>
    {selectedRide&&<Panel title={`Link booking PT-${selectedRide.id}`} sub="Select a customer only after checking their identity and mobile number."><div className="form-grid"><Input label="Find existing customer" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search mobile or name"/><Input label="Customer" as="select" value={customerId} onChange={e=>setCustomerId(e.target.value)} options={[{value:'',label:'Select matching customer'},...matches.map(c=>({value:String(c.id),label:`${c.name} · ${c.mobile||'No phone'} · #${c.id}`}))]}/></div><div className="form-actions"><Button disabled={!customerId} loading={busy} onClick={link}><Link2 size={16}/> Link this ride</Button><Button kind="secondary" onClick={()=>setSelectedRide(null)}>Cancel</Button></div></Panel>}
  </>;
}
