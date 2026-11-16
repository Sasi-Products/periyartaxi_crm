import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CarFront, History, Plus, Search } from 'lucide-react';
import { api, currency, dateTime } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heading, Panel, Button, Input, Notice, useNotice, Status, Empty } from '../components/UI';
import '../styles/customers.css';
const serviceOptions = [{value:'',label:'All services'}, ...[
  ['LOCAL','Local Trip'],['LOCAL_PACKAGE','Local Package'],['OUTSTATION','Outstation'],['DRIVER_RENT','Driver for Rent'],['VALET','Valet Parking']
].map(([value,label]) => ({value,label}))];
export default function CustomerRides({ mode = 'active' }) {
  const { id } = useParams(); const note = useNotice(); const { can } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [service, setService] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.get(`/customers/${id}`).then(r => setCustomer(r.data)).catch(note.error); }, [id]);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/customers/${id}/rides`, { params: { mode, page, pageSize:20, ...(service?{service}:{}), ...(status?{status}:{}) } }); setRows(data.rows || []); setTotal(data.total || 0); }
    catch (error) { note.error(error); }
    finally { setLoading(false); }
  }, [id, mode, page, service, status]);
  useEffect(() => { load(); }, [load]);
  const historical = mode === 'history';
  return <>
    <Heading title={historical ? 'Customer ride history' : 'Customer rides & bookings'} sub={`${customer?.name || 'Customer'} · ${historical ? 'Completed, cancelled and unsuccessful bookings' : 'Upcoming bookings, driver search and active trips'}`} action={<div className="customer-actions"><Link className="btn secondary" to={`/customers/${id}`}><ArrowLeft size={16}/> Customer profile</Link>{can('customers.manage') && <Link className="btn primary" to={`/booking?customerId=${id}`}><Plus size={16}/> New booking</Link>}</div>}/>
    <Notice state={note}/>
    <div className="customer-tabbar"><Link className={!historical ? 'selected':''} to={`/customers/${id}/rides`}><CarFront size={18}/> Active rides</Link><Link className={historical ? 'selected':''} to={`/customers/${id}/history`}><History size={18}/> Ride history</Link></div>
    <Panel title={historical ? 'Previous journeys' : 'Current & upcoming rides'} sub="All linked bookings, whether created in the customer app or by office staff.">
      <div className="customer-filters"><Input label="Service" as="select" value={service} onChange={e=>{setPage(1);setService(e.target.value);}} options={serviceOptions}/><Input label="Status" as="select" value={status} onChange={e=>{setPage(1);setStatus(e.target.value);}} options={[{value:'',label:'All statuses'},...(historical?['COMPLETED','CANCELLED','NO_DRIVER']:['REQUESTED','SEARCHING','OFFERED','ASSIGNED','ARRIVING','IN_PROGRESS']).map(value=>({value,label:value.replaceAll('_',' ')}))]}/></div>
      <div className="table-wrap"><table><thead><tr><th>Booking</th><th>Journey</th><th>Booked via</th><th>Schedule</th><th>Status</th><th>Fare</th><th></th></tr></thead><tbody>
        {rows.map(ride => <tr key={ride.id}><td><strong>PT-{String(ride.id).padStart(5,'0')}</strong><small className="muted block">{ride.service.replaceAll('_',' ')}</small></td><td><div className="customer-route"><strong>{ride.pickupAddress || 'Pickup location'}</strong><small>{ride.dropoffAddress || 'Service location / flexible drop'}</small></div></td><td>{String(ride.metadata?.bookingChannel || (ride.createdBy === ride.customerId ? 'APP' : 'ADMIN')).replaceAll('_',' ')}</td><td>{dateTime(ride.scheduledAt)}</td><td><Status value={ride.status}/></td><td>{currency(ride.finalFare ?? ride.estimatedFare)}</td><td><Link to={`/trips/${ride.id}`} className="btn secondary">Trip details</Link></td></tr>)}
      </tbody></table>{!loading && !rows.length && <Empty title={historical?'No ride history yet':'No active rides'} sub="This customer has no bookings in the selected category."/>}</div>
      <div className="customer-pagination"><span>{loading?'Loading...':`${total} bookings found`}</span><div><Button kind="secondary" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>Previous</Button><span>Page {page}</span><Button kind="secondary" disabled={page*20>=total||loading} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div>
    </Panel>
  </>;
}
