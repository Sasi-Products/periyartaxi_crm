import {NavLink,Outlet,useNavigate} from 'react-router-dom';import {useState,useEffect} from 'react';import {api} from '../lib/api';import {useAuth} from '../context/AuthContext';import {LayoutDashboard,CarFront,MapPinned,Users,Map,Receipt,CalendarClock,Wallet,LogOut,Menu,X,ShieldCheck,CircleDollarSign,Clock3,ChartNoAxesColumn,HandCoins,MessageSquareText,Settings2,ClipboardList,BookOpen,ScanLine,UserRound,Navigation,Home,FileClock,Star} from 'lucide-react';
const superLinks=[['/dashboard','Dashboard',LayoutDashboard,'dashboard.view'],['/trips','Trip Operations',CarFront,'trips.view'],['/booking','Create Booking',MapPinned,'trips.manage'],['/customers','Customers',UserRound,'customers.view'],['/branches','Branches & Boundaries',Map,'branches.manage'],['/pricing','Fare & Packages',CircleDollarSign,'pricing.manage'],['/drivers','Drivers',Users,'drivers.manage'],['/vehicles','Vehicles',CarFront,'vehicles.manage'],['/assignments','Car Assignments',CalendarClock,'assignments.manage'],['/users','Staff & Access',ShieldCheck,'users.manage'],['/tracking','Live Tracking',Navigation,'locations.view'],['/attendance','Attendance',Clock3,'attendance.manage'],['/payroll','Salary & Payroll',Wallet,'payroll.manage'],['/payments','Payments',HandCoins,'payments.manage'],['/expenses','Expenses',Receipt,'expenses.manage'],['/analytics','Analytics',ChartNoAxesColumn,'analytics.view'],['/notifications','Notifications',MessageSquareText,'notifications.send'],['/audit','Audit Logs',ClipboardList,'audit.view']];
const driverLinks=[['/driver','Duty Dashboard',LayoutDashboard],['/driver/trips','My Trips',CarFront],['/driver/documents','My Documents',ShieldCheck],['/driver/attendance','Attendance',Clock3],['/driver/earnings','Salary',Wallet],['/notifications','Notifications',MessageSquareText]];
const customerLinks=[['/ride','Book a Ride',Home],['/my-trips','My Trips',CarFront],['/my-places','Favorites',Star],['/notifications','Notifications',MessageSquareText],['/profile','My Profile',UserRound]];
function DriverLocationSync(){
  const [onDuty,setOnDuty]=useState(false);
  const [activeTrip,setActiveTrip]=useState(null);
  useEffect(()=>{let mounted=true;
    const check=async()=>{try{
      const [attendance,rides]=await Promise.all([api.get('/attendance'),api.get('/trips')]);
      if(!mounted)return;
      const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
      const entry=attendance.data.find(x=>x.day===day);
      setOnDuty(!!entry?.checkInAt&&!entry?.checkOutAt);
      setActiveTrip(rides.data.find(r=>r.status==='IN_PROGRESS')?.id||null);
    }catch{}};
    check();const timer=setInterval(check,25000);
    window.addEventListener('periyar:duty',check);
    return()=>{mounted=false;clearInterval(timer);window.removeEventListener('periyar:duty',check)};
  },[]);
  useEffect(()=>{if(!onDuty||!navigator.geolocation)return;
    let lastSent=0;
    const watch=navigator.geolocation.watchPosition(p=>{
      const payload={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,
        heading:p.coords.heading||0,speed:p.coords.speed||0};
      api.post('/locations/me',payload).catch(()=>{});
      if(activeTrip && Date.now()-lastSent>=10000){lastSent=Date.now();
        api.post(`/trips/${activeTrip}/gps`,{
          lat:payload.lat,lng:payload.lng,accuracyM:p.coords.accuracy,
          speedKmh:p.coords.speed==null?null:p.coords.speed*3.6,
          observedAt:new Date(p.timestamp).toISOString(),
        }).catch(()=>{});
      }
    },()=>{},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
    return()=>navigator.geolocation.clearWatch(watch);
  },[onDuty,activeTrip]);
  // Browser GPS only works while the browser/OS permits it. Native background service
  // or a vehicle tracker is required for reliable unattended telemetry.
  return null;
}
export function Layout(){const {user,logout,can}=useAuth(),[open,setOpen]=useState(false),navigate=useNavigate();const admin=['SUPER_ADMIN','ADMIN'].includes(user?.role);let links=admin?superLinks.filter(l=>can(l[3])):user?.role==='DRIVER'?driverLinks:customerLinks;const goLogout=()=>{logout();navigate('/login')};
 return <><>{user?.role==='DRIVER'&&<DriverLocationSync/>}</><div className={'app-shell '+(!admin?'mobile-shell':'')}><aside className={'sidebar '+(open?'is-open':'')}><div className="brand"><div className="brand-mark">PT</div><div><strong>PERIYAR<span>TAXI</span></strong><small>ERODE • TAMIL NADU</small></div><button className="hide-desktop menu-icon" onClick={()=>setOpen(false)}><X/></button></div><div className="sidebar-category">{user?.role==='SUPER_ADMIN'?'COMMAND CENTER':user?.role==='ADMIN'?'BRANCH OPERATIONS':user?.role==='DRIVER'?'DRIVER WORKSPACE':'RIDE WITH US'}</div><nav>{links.map(([path,label,Icon])=><NavLink key={path} to={path} end={path==='/ride'||path==='/driver'} onClick={()=>setOpen(false)} className={({isActive})=>'nav-link '+(isActive?'active':'')}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-foot"><div className="user-mini"><div className="avatar">{user?.name?.charAt(0)||'P'}</div><div><strong>{user?.name}</strong><small>{user?.role?.replaceAll('_',' ')}</small></div></div><button className="logout" onClick={goLogout}><LogOut size={18}/> Sign out</button></div></aside><div className="app-main"><header className="topbar"><button className="hide-desktop menu-toggle" onClick={()=>setOpen(true)}><Menu/></button><div className="topbar-title"><span className="topdot"/> Periyar Taxi <span className="topbar-light">/ Operations</span></div><div className="topbar-right"><span className="live-badge"><span/> Erode, Tamil Nadu</span><div className="avatar small">{user?.name?.charAt(0)||'P'}</div></div></header><main className="page-content"><Outlet/></main></div>{open&&<div className="sidebar-backdrop hide-desktop" onClick={()=>setOpen(false)}/>}</div></>}
