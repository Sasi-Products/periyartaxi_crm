import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserRound, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heading, Panel, Input, Button, Notice, useNotice } from '../components/UI';
import '../styles/customers.css';

const initial = { name: '', mobile: '', customerType: 'INDIVIDUAL', branchId: '', preferredLanguage: 'TAMIL', address: '', notes: '', alternateMobile: '' };
export default function CustomerForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const note = useNotice();
  const [form, setForm] = useState(initial);
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get('/branches').then(r => {
      const rows = Array.isArray(r.data) ? r.data : [];
      setBranches(rows);
      setForm(f => ({ ...f, branchId: String(user?.branchId || rows[0]?.id || '') }));
    }).catch(note.error);
  }, []);
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const save = async event => {
    event.preventDefault(); setSaving(true); note.clear();
    try {
      const { data } = await api.post('/customers', { ...form, branchId: Number(form.branchId) });
      navigate(`/customers/${data.id}`, { replace: true });
    } catch (error) { note.error(error); }
    finally { setSaving(false); }
  };
  return <>
    <Heading title="Create customer" sub="Register a customer at the branch, including walk-in passengers who do not have a mobile phone." action={<Link className="btn secondary" to="/customers"><ArrowLeft size={17}/> Customer directory</Link>}/>
    <Notice state={note}/>
    <form onSubmit={save} className="customer-form-stack">
      <Panel title="Customer information" sub="Mobile number is optional. Existing mobile-app customers must be selected, not registered again.">
        <div className="form-grid">
          <Input label="Customer full name *" value={form.name} onChange={e => update('name', e.target.value)} required maxLength={140} placeholder="Customer name"/>
          <Input label="Mobile number (optional)" type="tel" value={form.mobile} onChange={e => update('mobile', e.target.value)} placeholder="+91 9876543210"/>
          <Input label="Customer type" as="select" value={form.customerType} onChange={e => update('customerType', e.target.value)} options={[{value:'INDIVIDUAL',label:'Individual customer'},{value:'BUSINESS',label:'Business / corporate'}]}/>
          <Input label="Branch" as="select" value={form.branchId} onChange={e => update('branchId', e.target.value)} disabled={user?.role === 'ADMIN'} options={branches.map(branch => ({value:branch.id,label:branch.name}))}/>
          <Input label="Alternate contact (optional)" type="tel" value={form.alternateMobile} onChange={e => update('alternateMobile', e.target.value)}/>
          <Input label="Preferred language" as="select" value={form.preferredLanguage} onChange={e => update('preferredLanguage', e.target.value)} options={[{value:'TAMIL',label:'Tamil'},{value:'ENGLISH',label:'English'},{value:'OTHER',label:'Other'}]}/>
          <div className="full"><Input label="Address (optional)" as="textarea" rows={2} value={form.address} onChange={e => update('address', e.target.value)}/></div>
          <div className="full"><Input label="Internal notes (optional)" as="textarea" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Branch notes (visible to authorized staff only)"/></div>
        </div>
        <div className="customer-hint"><ShieldCheck size={18}/> A new customer account has no password. Mobile OTP login becomes available only to the verified holder of the registered phone number.</div>
        <div className="form-actions"><Button type="submit" loading={saving}><Save size={17}/> Save customer</Button><Link to="/customers" className="btn secondary">Cancel</Link></div>
      </Panel>
    </form>
  </>;
}
