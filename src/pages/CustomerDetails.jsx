import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CarFront, History, CalendarDays, Wallet, UserRound, Save, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { api, currency, dateTime } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heading, Panel, Input, Button, Notice, useNotice, Status, Loading, Empty } from '../components/UI';
import '../styles/customers.css';
const sources = { APP: 'Mobile app registration', ADMIN: 'Admin / counter registration', SUPER_ADMIN: 'Super Admin registration', LEGACY: 'Existing customer' };
export default function CustomerDetails() {
  const { id } = useParams();
  const { can } = useAuth();
  const note = useNotice();
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const editable = can('customers.manage');
  async function load() {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setCustomer(data);
      setForm({ name:data.name, customerType:data.profile?.customerType || 'INDIVIDUAL', preferredLanguage:data.profile?.preferredLanguage || 'TAMIL', alternateMobile:data.profile?.alternateMobile || '', address:data.profile?.address || '', notes:data.profile?.notes || '' });
    } catch (error) { note.error(error); }
  }
  useEffect(() => { load(); }, [id]);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { await api.patch(`/customers/${id}`, form); note.success('Customer details saved'); await load(); }
    catch (error) { note.error(error); }
    finally { setSaving(false); }
  }
  if (!customer) return <><Heading title="Customer details"/><Notice state={note}/><Loading/></>;
  const overview = [
    ['All bookings', customer.summary?.totalRides || 0, CalendarDays],
    ['Completed rides', customer.summary?.completedRides || 0, CarFront],
    ['Cancelled', customer.summary?.cancelledRides || 0, History],
    ['Completed fare', currency(customer.summary?.completedFare), Wallet]
  ];
  return <>
    <Heading title={customer.name} sub={`Customer PT-CUS-${String(customer.id).padStart(5,'0')} · ${sources[customer.profile?.createdVia] || 'Existing customer'}`} action={<div className="customer-actions"><Link className="btn secondary" to="/customers"><ArrowLeft size={17}/> Directory</Link>{editable && <Link className="btn primary" to={`/booking?customerId=${id}`}><CarFront size={17}/> Book ride</Link>}</div>}/>
    <Notice state={note}/>
    <div className="customer-overview">{overview.map(([label,value,Icon]) => <div key={label}><span><Icon size={15}/> {label}</span><strong>{value}</strong></div>)}</div>
    <div className="customer-tabbar"><Link to={`/customers/${id}/rides`}><CarFront size={17}/> Active & scheduled rides</Link><Link to={`/customers/${id}/history`}><History size={17}/> Completed & cancelled history</Link></div>
    <div className="two-col">
      <Panel title="Customer profile" sub="Phone numbers used for OTP login cannot be changed by staff from this form.">
        <div className="customer-profile-data"><div><span>Registered phone</span><strong>{customer.mobile || 'No mobile · Walk-in'}</strong></div><div><span>OTP phone verification</span><strong>{customer.profile?.mobileVerifiedAt ? 'Verified' : 'Not verified'}</strong></div><div><span>Registered</span><strong>{dateTime(customer.createdAt)}</strong></div><div><span>Account</span><Status value={customer.active ? 'ACTIVE' : 'INACTIVE'}/></div></div>
        {form && <form onSubmit={save}><div className="form-grid">
          <Input label="Customer name" value={form.name} disabled={!editable} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
          <Input label="Customer type" as="select" value={form.customerType} disabled={!editable} onChange={e=>setForm(f=>({...f,customerType:e.target.value}))} options={[{value:'INDIVIDUAL',label:'Individual'},{value:'BUSINESS',label:'Business'}]}/>
          <Input label="Preferred language" as="select" value={form.preferredLanguage} disabled={!editable} onChange={e=>setForm(f=>({...f,preferredLanguage:e.target.value}))} options={[{value:'TAMIL',label:'Tamil'},{value:'ENGLISH',label:'English'},{value:'OTHER',label:'Other'}]}/>
          <Input label="Alternate phone" type="tel" value={form.alternateMobile} disabled={!editable} onChange={e=>setForm(f=>({...f,alternateMobile:e.target.value}))}/>
          <div className="full"><Input label="Address" as="textarea" rows={2} value={form.address} disabled={!editable} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></div>
          <div className="full"><Input label="Private office notes" as="textarea" rows={3} value={form.notes} disabled={!editable} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
        </div>{editable && <Button type="submit" loading={saving}><Save size={17}/> Save changes</Button>}</form>}
      </Panel>
      <Panel title="Recent journeys" sub="Click a booking to open its trip details and full fare breakdown." action={<Link to={`/customers/${id}/history`} className="btn secondary">Full history</Link>}>
        {!customer.recentRides?.length && <Empty title="No linked rides" sub="Book a new ride or link an older counter booking."/>}
        {customer.recentRides?.map(ride => <Link key={ride.id} className="customer-ride-card" to={`/trips/${ride.id}`}><div><strong>PT-{String(ride.id).padStart(5,'0')} · {ride.service.replaceAll('_',' ')}</strong><p>{ride.pickupAddress || 'Pickup'} → {ride.dropoffAddress || 'Service location'}</p><small>{dateTime(ride.scheduledAt)}</small></div><div><Status value={ride.status}/><strong>{currency(ride.finalFare ?? ride.estimatedFare)}</strong></div></Link>)}
      </Panel>
    </div>
  </>;
}
