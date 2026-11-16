import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Gauge, Navigation, ShieldCheck, TimerReset, KeyRound, Flag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, currency, dateTime, dateInput, errText } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input, Panel, Notice, useNotice, Status } from '../components/UI.jsx';
import '../styles/tripEvidence.css';

const duration = sec => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
};
const asLocal = v => v ? dateInput(v) : dateInput(new Date());
const availableOtpStages = {
  ASSIGNED: 'START', ARRIVING: 'START', IN_PROGRESS: 'END',
};

export default function TripEvidence({ ride, onChanged }) {
  const { user } = useAuth();
  const admin = ['SUPER_ADMIN','ADMIN'].includes(user?.role);
  const driver = user?.role === 'DRIVER';
  const customer = user?.role === 'CUSTOMER';
  const canAct = admin || driver;
  const note = useNotice();
  const [state,setState] = useState(null);
  const [busy,setBusy] = useState(false);
  const [otp,setOtp] = useState('');
  const [verificationMode,setVerificationMode] = useState('OTP');
  const [reason,setReason] = useState('');
  const [passengerConfirmed,setPassengerConfirmed] = useState(false);
  const [waitReason,setWaitReason] = useState('Passenger requested a stop');
  const [waitNote,setWaitNote] = useState('');
  const [odometerStart,setOdometerStart] = useState('');
  const [odometerEnd,setOdometerEnd] = useState('');
  const [manualReason,setManualReason] = useState('');
  const [manualWaitStart,setManualWaitStart] = useState(asLocal(new Date(Date.now()-10*60000)));
  const [manualWaitEnd,setManualWaitEnd] = useState(asLocal(new Date()));
  const [manualWaitReason,setManualWaitReason] = useState('Passenger requested stop');
  const stage = availableOtpStages[ride.status] || null;
  const noPhone = !!ride.metadata?.passengerNoPhone || !(ride.guestMobile || ride.customer?.mobile);
  const activeWait = state?.waits?.find(w => w.status === 'PENDING' && !w.endedAt);
  const pendingWaits = state?.waits?.filter(w => w.status === 'PENDING' && w.endedAt) || [];
  const metrics = state?.pricing || state || {};
  const reload = useCallback(async () => {
    try { const r = await api.get(`/trips/${ride.id}/timing`); setState(r.data); }
    catch (e) { /* Overview remains usable if migration is still pending. */ }
  }, [ride.id]);
  useEffect(() => { reload();const interval=setInterval(reload,12000);return()=>clearInterval(interval); }, [reload]);
  useEffect(() => { setVerificationMode(noPhone ? 'NO_PHONE' : 'OTP');setOtp('');setReason('');setPassengerConfirmed(false); }, [ride.id, stage, noPhone]);
  async function post(endpoint,body={},message='Updated') {
    setBusy(true);note.clear();
    try {
      const {data} = await api.post(`/trips/${ride.id}${endpoint}`,body);
      note.success(message);await reload();if(onChanged)onChanged();return data;
    } catch(e) {note.error(e);return null;}
    finally{setBusy(false);}
  }
  const confirm = () => {
    if(!stage) return;
    let body;
    if(verificationMode==='OTP') body={otp:otp.trim()};
    else if(verificationMode==='NO_PHONE') body={noPhone:true,passengerConfirmed,reason};
    else body={adminOverride:true,reason};
    post(stage==='START'?'/start':'/finish',body,stage==='START'?'Trip started':'Trip ended and fare calculated');
  };
  const hasMobile = !noPhone;
  return <>
    <Panel title="Live running and waiting times" sub="Running time excludes approved passenger stops; GPS moving/stationary readings are measured when tracking is available.">
      <div className="trip-meter-grid">
        <div><Clock3 size={19}/><small>Total elapsed</small><strong>{duration(state?.elapsedSeconds)}</strong></div>
        <div><Flag size={19}/><small>Running (excluding waits)</small><strong>{duration(state?.runningSeconds)}</strong></div>
        <div><Navigation size={19}/><small>GPS moving</small><strong>{duration(state?.gpsMovingSeconds)}</strong></div>
        <div><TimerReset size={19}/><small>GPS stationary</small><strong>{duration(state?.gpsStationarySeconds)}</strong></div>
        <div><CheckCircle2 size={19}/><small>Approved waiting</small><strong>{duration(state?.approvedWaitingSeconds)}</strong></div>
      </div>
      <div className="trip-meter-meta">
        <span>Unobserved GPS time: <strong>{duration(state?.unobservedSeconds)}</strong></span>
        <span>GPS coverage: <strong>{Math.round(Number(state?.gpsCoverage||0)*100)}%</strong></span>
        <span>GPS distance: <strong>{Number(state?.gpsDistanceKm||0).toFixed(2)} km</strong></span>
        <span>Pending waiting: <strong>{duration(state?.pendingWaitingSeconds)}</strong></span>
      </div>
      {ride.status==='COMPLETED' && <div className="trip-meter-settlement"><strong>Fare distance: {Number(ride.metadata?.timing?.distanceKm ?? ride.distanceKm ?? 0).toFixed(2)} km</strong><span>Source: {ride.metadata?.timing?.distanceSource||'Awaiting calculation'}</span>{ride.metadata?.timing?.provisional && <div className="notice info"><AlertTriangle size={17}/> Provisional distance from route estimate. Operator must verify an odometer reading before final settlement.</div>}{Number(ride.metadata?.timing?.waitingFare||0)>0 && <span>Approved waiting charge: {currency(ride.metadata.timing.waitingFare)}</span>}</div>}
      <p className="muted trip-evidence-help">Stationary GPS readings include traffic and traffic lights. Only approved, explicitly recorded passenger waiting periods are eligible for separate waiting charges. Package/outstation hourly allowances use total elapsed time.</p>
    </Panel>
    {canAct && ride.status==='IN_PROGRESS' && <Panel title="Passenger waiting timer" sub="Start only for a passenger-requested stop, not traffic congestion.">
      <Notice state={note}/>
      {activeWait ? <><p>Waiting started at {dateTime(activeWait.startedAt)}. This period requires admin approval before billing.</p><Input label="Stop note (optional)" value={waitNote} onChange={e=>setWaitNote(e.target.value)}/><Button loading={busy} onClick={()=>post('/wait/end',{note:waitNote},'Waiting stopped — pending review')}><TimerReset size={16}/> Stop waiting</Button></>
        : <><Input label="Reason for the stop" value={waitReason} onChange={e=>setWaitReason(e.target.value)}/><Button loading={busy} onClick={()=>post('/wait/start',{reason:waitReason},'Waiting timer started')}><Clock3 size={16}/> Start passenger waiting</Button></>}
    </Panel>}
    {admin && !!ride.startedAt && <Panel title="Operator measurements & waiting review" sub="Approve driver-reported waits, add witnessed offline stops, or verify odometer distance. Every change is audited.">
      <Notice state={note}/>
      {pendingWaits.length>0 ? pendingWaits.map(w=><div className="trip-wait-row" key={w.id}><div><strong>{w.reason}</strong><small>{dateTime(w.startedAt)} – {dateTime(w.endedAt)} · {duration((new Date(w.endedAt)-new Date(w.startedAt))/1000)}</small></div><div className="form-actions"><Button kind="secondary" loading={busy} onClick={()=>post(`/wait/${w.id}/review`,{approve:true},'Waiting approved')}>Approve</Button><Button kind="danger-outline" loading={busy} onClick={()=>post(`/wait/${w.id}/review`,{approve:false},'Waiting rejected')}>Reject</Button></div></div>) : <p className="muted">No pending waiting intervals.</p>}
      <details className="trip-evidence-details"><summary>Add manual waiting interval</summary><div className="form-grid"><Input type="datetime-local" label="Waiting began" value={manualWaitStart} onChange={e=>setManualWaitStart(e.target.value)}/><Input type="datetime-local" label="Waiting ended" value={manualWaitEnd} onChange={e=>setManualWaitEnd(e.target.value)}/></div><Input label="Reason" value={manualWaitReason} onChange={e=>setManualWaitReason(e.target.value)}/><Button kind="secondary" loading={busy} onClick={()=>post('/wait/manual',{startedAt:new Date(manualWaitStart).toISOString(),endedAt:new Date(manualWaitEnd).toISOString(),reason:manualWaitReason},'Manual waiting interval recorded')}>Add audited waiting</Button></details>
      <details className="trip-evidence-details"><summary>Verify actual KM using odometer</summary><div className="form-grid"><Input label="Odometer at start (km)" type="number" min="0" step="0.1" value={odometerStart} onChange={e=>setOdometerStart(e.target.value)}/><Input label="Odometer at end (km)" type="number" min="0" step="0.1" value={odometerEnd} onChange={e=>setOdometerEnd(e.target.value)}/></div><Input label="Evidence and verification reason" value={manualReason} onChange={e=>setManualReason(e.target.value)}/><Button kind="secondary" loading={busy} onClick={()=>post('/distance/verify',{odometerStartKm:Number(odometerStart),odometerEndKm:Number(odometerEnd),reason:manualReason},'Verified distance saved; fare recalculated if trip completed')}><Gauge size={16}/> Verify odometer distance</Button></details>
    </Panel>}
    {stage && <Panel title={`${stage==='START'?'Start':'End'} trip — passenger verification`} sub={stage==='START'?'Verify the passenger before starting the ride.':'Request a separate OTP before closing the journey.'}>
      <Notice state={note}/>
      {hasMobile && <div className="trip-evidence-send"><div><KeyRound size={20}/><strong>Passenger verification</strong><small>A separate 6-digit code is sent by SMS for each stage; valid for 5 minutes.</small></div><Button kind="secondary" disabled={busy} onClick={()=>post('/otp/request',{stage},'OTP requested — ask the passenger for the code')}>Send {stage.toLowerCase()} OTP</Button></div>}
      {canAct ? <>
        <div className="trip-method-options"><label><input type="radio" value="OTP" checked={verificationMode==='OTP'} disabled={!hasMobile} onChange={()=>setVerificationMode('OTP')}/> Passenger OTP</label><label><input type="radio" value="NO_PHONE" checked={verificationMode==='NO_PHONE'} disabled={hasMobile} onChange={()=>setVerificationMode('NO_PHONE')}/> Passenger has no phone</label>{admin && <label><input type="radio" value="EMERGENCY" checked={verificationMode==='EMERGENCY'} onChange={()=>setVerificationMode('EMERGENCY')}/> Supervisor emergency override</label>}</div>
        {verificationMode==='OTP' ? <Input label="Passenger 6-digit OTP" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter code from passenger"/>:
          <><Input as="textarea" rows={2} label="Reason — recorded in audit logs" value={reason} onChange={e=>setReason(e.target.value)} placeholder={verificationMode==='NO_PHONE'?'E.g. passenger has no mobile phone; verified identity at pickup':'E.g. SMS service outage, verified passenger by phone and ID'}/>{verificationMode==='NO_PHONE' && <label className="trip-attestation"><input type="checkbox" checked={passengerConfirmed} onChange={e=>setPassengerConfirmed(e.target.checked)}/> I have confirmed the passenger’s consent in person.</label>}</>}
        <Button loading={busy} disabled={(verificationMode==='OTP'&&otp.length!==6)||(verificationMode==='NO_PHONE'&&!passengerConfirmed)} onClick={confirm}><ShieldCheck size={16}/> {stage==='START'?'Verify and start ride':'Verify and end ride'}</Button>
      </> : <p className="muted">Your code is sent to the passenger’s phone. Share it only when you are ready to start or finish the ride. Never share it over an unexpected call.</p>}
    </Panel>}
    {customer && noPhone && stage && <p className="notice info">This booking has no reachable passenger phone. The driver or operator must record an in-person confirmation to proceed.</p>}
  </>;
}
