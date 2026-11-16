import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Heading, Panel, Input, Button, Notice, useNotice } from '../components/UI.jsx';

export default function ChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const note = useNotice();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', repeatPassword: '' });
  const [busy, setBusy] = useState(false);
  const change = (key, value) => setForm((value) => ({ ...value, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 12) return note.error('New password must be at least 12 characters');
    if (form.newPassword !== form.repeatPassword) return note.error('Passwords do not match');
    if (form.currentPassword === form.newPassword) return note.error('Choose a different password');
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      logout();
      navigate('/login', { replace: true });
    } catch (error) { note.error(error); }
    finally { setBusy(false); }
  };
  return <div style={{ maxWidth: 680, margin: '0 auto' }}>
    <Heading title="Secure your driver account" sub="Change the temporary password before accessing your duty dashboard or documents."/>
    <Notice state={note}/>
    <Panel title="First login — password change">
      <p className="notice info"><ShieldCheck size={19}/> Your new password must be unique and at least 12 characters.</p>
      <form onSubmit={submit}>
        <Input label="Temporary password" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => change('currentPassword', e.target.value)}/>
        <Input label="New password" type="password" required minLength={12} autoComplete="new-password" value={form.newPassword} onChange={(e) => change('newPassword', e.target.value)}/>
        <Input label="Confirm new password" type="password" required minLength={12} autoComplete="new-password" value={form.repeatPassword} onChange={(e) => change('repeatPassword', e.target.value)}/>
        <Button type="submit" loading={busy}><KeyRound size={17}/> Update password & sign in again</Button>
      </form>
    </Panel>
  </div>;
}
