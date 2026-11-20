import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {ArrowLeft,FileText,Upload,Download,Trash2} from 'lucide-react';
import {api,dateTime} from '../lib/api.js';
import {Heading,Panel,Input,Button,Notice,useNotice,DataTable} from '../components/UI.jsx';
const categories=['PHOTO','ID_PROOF','ADDRESS_PROOF','SIGNED_AGREEMENT','BANK_PROOF','QUALIFICATION','OTHER'];
export default function StaffDocuments(){
 const {id}=useParams(),note=useNotice();const [staff,setStaff]=useState(null),[docs,setDocs]=useState([]),[file,setFile]=useState(null),[category,setCategory]=useState('SIGNED_AGREEMENT'),[description,setDescription]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{const [u,d]=await Promise.all([api.get('/users'),api.get(`/users/${id}/documents`)]);setStaff(u.data.find(x=>String(x.id)===id)||null);setDocs(d.data||[])}catch(e){note.error(e)}}
 useEffect(()=>{load()},[id]);
 async function upload(e){e.preventDefault();if(!file)return note.error('Select a document');if(file.size>8*1024*1024)return note.error('Maximum file size 8 MB');const data=new FormData();data.append('file',file);data.append('category',category);data.append('description',description);setBusy(true);try{await api.post(`/users/${id}/documents`,data);setFile(null);setDescription('');await load();note.success('Private staff document uploaded')}catch(e){note.error(e)}finally{setBusy(false)}}
 async function download(row){try{const response=await api.get(`/users/${id}/documents/${row.id}`,{responseType:'blob'});const url=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=url;a.download=row.originalName||'staff-document';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){note.error(e)}}
 async function remove(row){if(!window.confirm('Delete this staff document permanently?'))return;try{await api.delete(`/users/${id}/documents/${row.id}`);await load();note.success('Document removed')}catch(e){note.error(e)}}
 return <><Heading title={`Staff documents — ${staff?.name||'Staff'}`} sub="Private employment paperwork and signed Periyar Taxi agreements; accessible only to authorized admins." action={<Link className="btn secondary" to="/users"><ArrowLeft size={16}/> Staff & access</Link>}/><Notice state={note}/>
 <Panel title="Upload staff documents"><form className="form-grid" onSubmit={upload}><Input label="Document type" as="select" value={category} onChange={e=>setCategory(e.target.value)} options={categories.map(v=>({value:v,label:v.replaceAll('_',' ')}))}/><label className="field"><span>Choose PDF or image</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><div className="full"><Input label="Notes" value={description} onChange={e=>setDescription(e.target.value)}/></div><div className="full"><Button type="submit" loading={busy}><Upload size={16}/> Upload private document</Button></div></form></Panel>
 <Panel title="Staff document history"><DataTable headers={['Type','File','Uploaded','Description','Actions']} rows={docs} render={r=><><td><FileText size={16}/> {r.category.replaceAll('_',' ')}</td><td>{r.originalName}</td><td>{dateTime(r.createdAt)}</td><td>{r.description||'—'}</td><td><div className="form-actions"><Button kind="secondary" onClick={()=>download(r)}><Download size={15}/> Download</Button><Button kind="danger-outline" onClick={()=>remove(r)}><Trash2 size={15}/> Remove</Button></div></td></>}/></Panel>
 </>;
}
