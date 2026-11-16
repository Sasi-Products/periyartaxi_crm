import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, UserRound, History, CarFront, ArrowRight, Users, RefreshCcw } from 'lucide-react';
import { api, currency, dateTime } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Heading, Panel, Button, Input, Notice, useNotice, Status, Empty } from '../components/UI';
import '../styles/customers.css';

const sourceLabel = { APP: 'Mobile app', ADMIN: 'Admin booking', SUPER_ADMIN: 'Super Admin booking', LEGACY: 'Existing record' };
export default function Customers() {
  const note = useNotice();
  const { user, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('ALL');
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const canCreate = can('customers.manage');

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    api.get('/branches').then(r => setBranches(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [user?.role]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: { q: search.trim(), source, page, pageSize: 20, ...(branchId ? { branchId } : {}) } });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (error) { note.error(error); }
    finally { setLoading(false); }
  }, [search, source, page, branchId]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const completed = rows.reduce((n, x) => n + Number(x.summary?.completedRides || 0), 0);
  const rides = rows.reduce((n, x) => n + Number(x.summary?.totalRides || 0), 0);
  return <>
    <Heading title="Customer management" sub="Customers from the mobile app and those registered at the branch counter. View every linked ride in one place." action={canCreate && <Link to="/customers/new" className="btn primary"><Plus size={17}/> Add customer</Link>}/>
    <Notice state={note}/>
    <div className="customer-overview">
      <div><span>Matching customers</span><strong>{total.toLocaleString('en-IN')}</strong></div>
      <div><span>Rides on this page</span><strong>{rides}</strong></div>
      <div><span>Completed rides on this page</span><strong>{completed}</strong></div>
    </div>
    <Panel title="Customer directory" sub="Search names and mobile numbers. A customer can have multiple bookings from either channel." action={<Link className="btn secondary" to="/customers/unlinked"><History size={16}/> Unlinked old bookings</Link>}>
      <div className="customer-filters">
        <label className="customer-search"><Search size={18}/><input value={search} placeholder="Search customer name or mobile" onChange={e => { setPage(1); setSearch(e.target.value); }}/></label>
        <Input label="Registration source" as="select" value={source} onChange={e => { setPage(1); setSource(e.target.value); }} options={[{value:'ALL',label:'All sources'},...Object.entries(sourceLabel).map(([value,label]) => ({value,label}))]}/>
        {user?.role === 'SUPER_ADMIN' && <Input label="Branch" as="select" value={branchId} onChange={e => { setPage(1); setBranchId(e.target.value); }} options={[{value:'',label:'All branches'},...branches.map(b => ({value:b.id,label:b.name}))]}/>}
        <Button kind="secondary" onClick={load}><RefreshCcw size={16}/> Refresh</Button>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Source</th><th>Rides</th><th>Completed fare</th><th>Registered</th><th>Actions</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}>
          <td><div className="customer-person"><span className="customer-avatar"><UserRound size={20}/></span><div><strong>{row.name}</strong><small>{row.mobile || 'Walk-in · No phone'} · PT-CUS-{String(row.id).padStart(5,'0')}</small></div></div></td>
          <td><span className="customer-channel">{sourceLabel[row.profile?.createdVia] || 'Existing record'}</span></td>
          <td><strong>{row.summary?.totalRides || 0}</strong><small className="block muted">{row.summary?.completedRides || 0} completed</small></td>
          <td>{currency(row.summary?.completedFare)}</td>
          <td>{dateTime(row.createdAt)}</td>
          <td><div className="customer-actions"><Link to={`/customers/${row.id}`} className="btn secondary">View</Link><Link to={`/customers/${row.id}/rides`} title="Active rides" className="customer-icon-link"><CarFront size={17}/></Link><Link to={`/customers/${row.id}/history`} title="Ride history" className="customer-icon-link"><History size={17}/></Link>{canCreate && <Link to={`/booking?customerId=${row.id}`} className="customer-icon-link" title="Book for customer"><ArrowRight size={17}/></Link>}</div></td>
        </tr>)}
      </tbody></table>{!rows.length && !loading && <Empty title="No customers found" sub="Try another filter, or add a new walk-in customer."/>}</div>
      <div className="customer-pagination"><span>{loading ? 'Loading...' : `Showing ${rows.length} of ${total}`}</span><div><Button kind="secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page}</span><Button kind="secondary" disabled={page * 20 >= total || loading} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
    </Panel>
  </>;
}
