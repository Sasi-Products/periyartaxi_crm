import {useEffect,useMemo,useState} from 'react';
import {Save,Plus,Pencil,Trash2,RotateCcw,Calculator} from 'lucide-react';
import {api,currency} from '../lib/api.js';
import {Heading,Panel,Input,Button,Notice,useNotice,DataTable,Status} from '../components/UI.jsx';

const CARS=['ALL','MINI','SEDAN','SUV','SUV_PLUS','TEMPO_TRAVELLER','COACH_VAN','MINI_BUS','BUS','URBANIA'];
const RENT=['ALL','MANUAL','AUTOMATIC','LUXURY'];
const SERVICES=[['LOCAL','Local Trips'],['LOCAL_PACKAGE','Local Packages'],['OUTSTATION','Outstation'],['DRIVER_RENT','Driver for Rent'],['VALET','Valet Parking']];
const defaults={
 LOCAL:{baseKm:3,baseFare:100,extraKm:21,boundaryFee:70,graceKm:3,convertAfterKm:3,waitingPerMinute:0,waitingGraceMinutes:0},
 LOCAL_PACKAGE:{boundaryFee:70,graceKm:3,convertAfterKm:3},
 OUTSTATION:{shortThresholdKm:100,minFare:450,includedKm:30,perKm:13,shortIncludedHours:3,longIncludedHours:5,extraHour:80,oneWayDistanceMultiplier:1,roundTripDistanceMultiplier:2},
 DRIVER_RENT:{minimumHours:6,minimumFare:700,extraHour:55},
 VALET:{minimumHours:4,perDriverBaseFare:0,extraHourPerDriver:0,maxDrivers:30},
};
const specs={
 LOCAL:[['baseKm','Minimum included KM'],['baseFare','Base fare (₹)'],['extraKm','Extra KM (₹/km)'],['boundaryFee','Boundary / empty charge (₹)'],['graceKm','Boundary charge threshold (km)'],['convertAfterKm','Convert to Outstation beyond (km)'],['waitingPerMinute','Approved passenger waiting (₹/min)'],['waitingGraceMinutes','Free waiting (minutes)']],
 LOCAL_PACKAGE:[['boundaryFee','Boundary / empty charge (₹)'],['graceKm','Boundary grace (km)'],['convertAfterKm','Outstation conversion threshold (km)']],
 DRIVER_RENT:[['minimumHours','Minimum hours'],['minimumFare','Minimum driver rent (₹)'],['extraHour','Extra hour (₹/hour)']],
 VALET:[['minimumHours','Included event hours'],['perDriverBaseFare','Base charge per driver (₹)'],['extraHourPerDriver','Extra hour per driver (₹/hour)'],['maxDrivers','Maximum number of drivers']],
};
const emptyPackage=(category='ALL')=>({name:'',vehicleType:category,hours:2,kms:20,baseFare:420,extraHour:90,extraKm:21,active:true});
const json=v=>{if(typeof v==='string'){try{v=JSON.parse(v)}catch{return {}}}return v&&typeof v==='object'&&!Array.isArray(v)?v:{}};
const categoryLabel=s=>s==='ALL'?'All categories (fallback)':s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase());
export default function Pricing(){
 const note=useNotice();const [branches,setBranches]=useState([]),[branchId,setBranchId]=useState('');
 const [service,setService]=useState('LOCAL'),[category,setCategory]=useState('ALL'),[rules,setRules]=useState({}),[versions,setVersions]=useState({});
 const [drafts,setDrafts]=useState({}),[packages,setPackages]=useState([]),[pkg,setPkg]=useState(emptyPackage),[editId,setEditId]=useState(null),[busy,setBusy]=useState(false),[band,setBand]=useState('BELOW');
 const categories=service==='DRIVER_RENT'?RENT:CARS;
 const choice=categories.includes(category)?category:'ALL';
 const key=`${branchId}:${choice}:${service}`;
 const current=useMemo(()=>{
  const source={...defaults[service],...json(rules[service]),...json(drafts[key])};
  if(service==='OUTSTATION'){
   for(const field of ['shortPerKm','longPerKm'])if(source[field]===undefined)source[field]=Number(source.perKm||13);
   for(const field of ['shortExtraHour','longExtraHour'])if(source[field]===undefined)source[field]=Number(source.extraHour||80);
  }
  return source;
 },[service,rules,drafts,key]);
 useEffect(()=>{api.get('/branches').then(r=>{const list=Array.isArray(r.data)?r.data:[];setBranches(list);setBranchId(String(list[0]?.id||''));}).catch(note.error)},[]);
 useEffect(()=>{if(!categories.includes(category)){setCategory('ALL');return}if(!branchId)return;let alive=true;
  Promise.all([api.get('/pricing',{params:{branchId,vehicleType:category}}),api.get('/pricing/packages',{params:{branchId}})]).then(([r,p])=>{
   if(!alive)return;
   setRules(Object.fromEntries((r.data||[]).map(x=>[x.service,json(x.config)])));
   setVersions(Object.fromEntries((r.data||[]).map(x=>[x.service,x.configuredVehicleType])));
   setPackages(Array.isArray(p.data)?p.data:[]);
  }).catch(note.error);return()=>{alive=false};
 },[branchId,category]);
 function change(k,v){setDrafts(prev=>({...prev,[key]:{...prev[key],[k]:Number(v)}}))}
 async function reload(){const [r,p]=await Promise.all([api.get('/pricing',{params:{branchId,vehicleType:choice}}),api.get('/pricing/packages',{params:{branchId}})]);setRules(Object.fromEntries((r.data||[]).map(x=>[x.service,json(x.config)])));setVersions(Object.fromEntries((r.data||[]).map(x=>[x.service,x.configuredVehicleType])));setPackages(p.data||[])}
 async function save(){if(!branchId)return note.error('Select a branch');if(service==='OUTSTATION'&&Number(current.shortThresholdKm)<=Number(current.includedKm))return note.error('Threshold must exceed short-distance included kilometres');setBusy(true);try{
  await api.put('/pricing',{branchId:Number(branchId),service,vehicleType:choice,config:current});await reload();
  setDrafts(old=>{const next={...old};delete next[key];return next});note.success(`${SERVICES.find(s=>s[0]===service)[1]} rates saved for ${categoryLabel(choice)}`);
 }catch(e){note.error(e)}finally{setBusy(false)}}
 async function savePackage(){setBusy(true);try{
  const payload={...pkg,branchId:Number(branchId),vehicleType:pkg.vehicleType||'ALL',hours:Number(pkg.hours),kms:Number(pkg.kms),baseFare:Number(pkg.baseFare),extraHour:Number(pkg.extraHour),extraKm:Number(pkg.extraKm)};
  if(editId)await api.patch(`/pricing/packages/${editId}`,payload);else await api.post('/pricing/packages',payload);
  setEditId(null);setPkg(emptyPackage(choice));await reload();note.success('Package saved');
 }catch(e){note.error(e)}finally{setBusy(false)}}
 async function removePackage(record){if(!window.confirm(`Deactivate “${record.name}” for ${categoryLabel(record.vehicleType||'ALL')}? Existing bookings remain intact.`))return;
  try{await api.delete(`/pricing/packages/${record.id}`);if(editId===record.id){setEditId(null);setPkg(emptyPackage(choice))}await reload();note.success('Package deactivated; ride history preserved')}catch(e){note.error(e)}
 }
 const renderFields=fields=><div className="form-grid pricing-fields">{fields.map(([name,label,help])=><Input key={name} label={label} help={help} type="number" min="0" step="any" value={current[name]??0} onChange={e=>change(name,e.target.value)}/>)}</div>;
 return <>
  <Heading title="Vehicle-wise fares & packages" sub="Configure every taxi service for each vehicle category in each branch. Existing rides keep their original rate snapshot."/>
  <Notice state={note}/>
  <Panel title="Select fare schedule" sub="All categories is the default. Individual categories can override it without changing the others.">
   <div className="form-grid">
    <Input label="Branch" as="select" value={branchId} onChange={e=>{setBranchId(e.target.value);setEditId(null)}} options={branches.map(b=>({value:String(b.id),label:b.name}))}/>
    <Input label="Service" as="select" value={service} onChange={e=>{setService(e.target.value);setCategory('ALL');setBand('BELOW')}} options={SERVICES.map(([value,label])=>({value,label}))}/>
    <Input label={service==='DRIVER_RENT'?'Customer vehicle transmission / class':'Periyar Taxi vehicle category'} as="select" value={choice} onChange={e=>{setCategory(e.target.value);setEditId(null)}} options={categories.map(v=>({value:v,label:categoryLabel(v)}))}/>
   </div>
   {versions[service]&&versions[service]!==choice&&<p className="notice info">Showing inherited default rates. Press Save to create a dedicated rate for <strong>{categoryLabel(choice)}</strong>.</p>}
  </Panel>
  <Panel title={SERVICES.find(s=>s[0]===service)[1]} sub={service==='OUTSTATION'?'Two separately editable distance bands, with their own km and hourly rates.':service==='DRIVER_RENT'?'Set a distinct base price and additional hour charge for Manual, Automatic and Luxury customer vehicles.':'All numeric fields can be changed by the Super Admin.'}>
   {service!=='OUTSTATION'?renderFields(specs[service]):<>
    <div className="form-grid"><Input label="Distance split (km)" type="number" value={current.shortThresholdKm} min="1" onChange={e=>change('shortThresholdKm',e.target.value)}/><Input label="One-way billable distance multiplier" type="number" min="0" step="any" value={current.oneWayDistanceMultiplier} onChange={e=>change('oneWayDistanceMultiplier',e.target.value)}/><Input label="Round-trip distance multiplier" type="number" min="0" step="any" value={current.roundTripDistanceMultiplier} onChange={e=>change('roundTripDistanceMultiplier',e.target.value)}/></div>
    <div className="form-actions" style={{margin:'18px 0'}}><Button kind={band==='BELOW'?'primary':'secondary'} onClick={()=>setBand('BELOW')}>Below {current.shortThresholdKm} km</Button><Button kind={band==='ABOVE'?'primary':'secondary'} onClick={()=>setBand('ABOVE')}>At / above {current.shortThresholdKm} km</Button></div>
    {band==='BELOW'?<><h3>Short-distance Outstation</h3><p className="muted">Minimum fare includes kilometres and hours, then extra kilometre/hour charges apply.</p>{renderFields([['minFare','Minimum fare (₹)'],['includedKm','KM included'],['shortIncludedHours','Included hours'],['shortPerKm','Extra km (₹/km)'],['shortExtraHour','Extra hour (₹/hour)']])}</>:<><h3>Long-distance Outstation</h3><p className="muted">No minimum fare. All billable kilometres use this rate; included travel hours and extra hour rate are separate.</p>{renderFields([['longPerKm','Fare per km (₹/km)'],['longIncludedHours','Included hours'],['longExtraHour','Additional hour (₹/hour)']])}</>}
    <DataTable headers={['Distance band','Fare policy','Extra time','Edit']} rows={[
      {id:'below',name:`Below ${current.shortThresholdKm} km`,policy:`${currency(current.minFare)} includes ${current.includedKm} km; ${currency(current.shortPerKm)}/extra km`,hours:`${current.shortIncludedHours} hrs included, ${currency(current.shortExtraHour)}/extra hr`,band:'BELOW'},
      {id:'above',name:`At / above ${current.shortThresholdKm} km`,policy:`${currency(current.longPerKm)}/km (no minimum fare)`,hours:`${current.longIncludedHours} hrs included, ${currency(current.longExtraHour)}/extra hr`,band:'ABOVE'}
    ]} render={r=><><td>{r.name}</td><td>{r.policy}</td><td>{r.hours}</td><td><Button kind="secondary" onClick={()=>setBand(r.band)}><Pencil size={15}/> Edit</Button></td></>}/>
    <p className="muted">Both bands are saved together for {categoryLabel(choice)}. Switch tabs before saving to review each band.</p>
   </>}
   {service==='LOCAL'&&<div className="notice info">Example: 8 km = {currency(Number(current.baseFare||0)+Math.max(0,8-Number(current.baseKm||0))*Number(current.extraKm||0))} before boundary charges.</div>}
   <div className="form-actions"><Button loading={busy} onClick={save}><Save size={16}/> Save {categoryLabel(choice)} rates</Button><Button kind="secondary" onClick={()=>setDrafts(p=>{const next={...p};delete next[key];return next})}><RotateCcw size={15}/> Discard edits</Button></div>
  </Panel>
  {service==='LOCAL_PACKAGE'&&<Panel title="Local packages — create, edit, deactivate" sub="Each package can be available for a specific car category, or for all cars.">
   <div className="form-grid">
    <Input label="Vehicle category" as="select" value={pkg.vehicleType} onChange={e=>setPkg(p=>({...p,vehicleType:e.target.value}))} options={CARS.map(v=>({value:v,label:categoryLabel(v)}))}/>
    <Input label="Package name" value={pkg.name} onChange={e=>setPkg(p=>({...p,name:e.target.value}))}/>
    {[["hours","Included hours"],["kms","Included kilometres"],["baseFare","Base fare (₹)"],["extraHour","Extra hour (₹/hr)"],["extraKm","Extra kilometre (₹/km)"]].map(([name,label])=><Input key={name} label={label} type="number" min="0" step="any" value={pkg[name]} onChange={e=>setPkg(p=>({...p,[name]:e.target.value}))}/>)}
    <Input label="Availability" as="select" value={pkg.active?'YES':'NO'} onChange={e=>setPkg(p=>({...p,active:e.target.value==='YES'}))} options={[{value:'YES',label:'Active'},{value:'NO',label:'Inactive'}]}/>
   </div>
   <div className="form-actions"><Button loading={busy} onClick={savePackage}><Save size={16}/>{editId?'Update package':'Create package'}</Button>{editId&&<Button kind="secondary" onClick={()=>{setEditId(null);setPkg(emptyPackage(choice))}}>Cancel edit</Button>}</div>
   <DataTable headers={['Category','Package','Included','Base','Extra hour','Extra km','Status','Actions']} rows={packages} render={r=><><td>{categoryLabel(r.vehicleType||'ALL')}</td><td><strong>{r.name}</strong></td><td>{r.hours} h / {r.kms} km</td><td>{currency(r.baseFare)}</td><td>{currency(r.extraHour)}</td><td>{currency(r.extraKm)}</td><td><Status value={r.active?'ACTIVE':'INACTIVE'}/></td><td><div className="form-actions"><Button kind="secondary" onClick={()=>{setPkg({...r});setEditId(r.id);window.scrollTo({top:0,behavior:'smooth'})}}><Pencil size={15}/> Edit</Button>{r.active&&<Button kind="danger-outline" onClick={()=>removePackage(r)}><Trash2 size={15}/> Delete</Button>}</div></td></>}/>
  </Panel>}
 </>;
}
