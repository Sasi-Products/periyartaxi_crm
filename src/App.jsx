import React from 'react';import {BrowserRouter,Navigate,Route,Routes,Outlet,useLocation} from 'react-router-dom';import {useJsApiLoader} from '@react-google-maps/api';
import {AuthProvider,useAuth} from './context/AuthContext';import {Layout} from './components/Layout';import Login from './pages/Login';import Booking from './pages/Booking';import Dashboard from './pages/Dashboard';import AnalyticsDetailed from './pages/AnalyticsDetailed';import Branches from './pages/Branches';import Pricing from './pages/Pricing';import Users from './pages/Users';
import Customers from './pages/Customers.jsx';
import CustomerForm from './pages/CustomerForm.jsx';
import CustomerDetails from './pages/CustomerDetails.jsx';
import CustomerRides from './pages/CustomerRides.jsx';
import UnlinkedBookings from './pages/UnlinkedBookings.jsx';import Trips,{TripDetails} from './pages/Trips';import Vehicles from './pages/Vehicles';import VehicleForm from './pages/VehicleForm';import VehicleDetails from './pages/VehicleDetails';import Drivers from './pages/Drivers';import CreateDriver from './pages/CreateDriver';import ChangePassword from './pages/ChangePassword';import Assignments from './pages/Assignments';import {DriverDuty,DriverDocuments,DriverEarnings} from './pages/Driver';import {Tracking,Attendance,Payroll,Payments,Expenses,Analytics,Notifications,Audit} from './pages/Operations';import {Profile,Places} from './pages/Customer';
const libs=['places'];const key=import.meta.env.VITE_GOOGLE_MAPS_KEY||'MISSING_KEY';
function WithMaps({children}){const {isLoaded,loadError}=useJsApiLoader({id:'periyar-maps',googleMapsApiKey:key,libraries:libs});return <>{children}</>}
const start=user=>user?.role==='DRIVER'?'/driver':user?.role==='CUSTOMER'?'/ride':'/dashboard';
function Gate({children,roles,permission}){const {user,token,can}=useAuth();const l=useLocation();if(!user||!token)return <Navigate to="/login" state={{from:l}} replace/>;if(user.mustChangePassword&&l.pathname!=='/change-password')return <Navigate to="/change-password" replace/>;if(roles&&!roles.includes(user.role)&&user.role!=='SUPER_ADMIN')return <Navigate to={start(user)} replace/>;if(permission&&!can(permission))return <Navigate to={start(user)} replace/>;return children}
function Start(){const {user}=useAuth();return <Navigate to={user?.mustChangePassword?'/change-password':start(user)} replace/>}
const ADMIN=['ADMIN','SUPER_ADMIN'];
function Router(){const {user,token}=useAuth();return <Routes><Route path="/login" element={token&&user?<Navigate to={start(user)} replace/>:<Login/>}/><Route element={<Gate><Layout/></Gate>}>
 <Route index element={<Start/>}/>
 <Route path="change-password" element={<ChangePassword/>}/>
 <Route path="dashboard" element={<Gate roles={ADMIN} permission="dashboard.view"><Dashboard/></Gate>}/>
 <Route path="booking" element={<Gate roles={ADMIN} permission="trips.manage"><Booking/></Gate>}/>
 <Route path="branches" element={<Gate roles={['SUPER_ADMIN']}><Branches/></Gate>}/>
 <Route path="pricing" element={<Gate roles={['SUPER_ADMIN']}><Pricing/></Gate>}/>
 <Route path="customers" element={<Gate roles={ADMIN} permission="customers.view"><Customers/></Gate>}/>
 <Route path="customers/new" element={<Gate roles={ADMIN} permission="customers.manage"><CustomerForm/></Gate>}/>
 <Route path="customers/unlinked" element={<Gate roles={ADMIN} permission="customers.view"><UnlinkedBookings/></Gate>}/>
 <Route path="customers/:id" element={<Gate roles={ADMIN} permission="customers.view"><CustomerDetails/></Gate>}/>
 <Route path="customers/:id/rides" element={<Gate roles={ADMIN} permission="customers.view"><CustomerRides mode="active"/></Gate>}/>
 <Route path="customers/:id/history" element={<Gate roles={ADMIN} permission="customers.view"><CustomerRides mode="history"/></Gate>}/>
 <Route path="users" element={<Gate roles={ADMIN} permission="users.manage"><Users/></Gate>}/>
 <Route path="vehicles" element={<Gate roles={ADMIN} permission="vehicles.manage"><Vehicles/></Gate>}/>
 <Route path="vehicles/new" element={<Gate roles={ADMIN} permission="vehicles.manage"><VehicleForm/></Gate>}/>
 <Route path="vehicles/:id/edit" element={<Gate roles={ADMIN} permission="vehicles.manage"><VehicleForm/></Gate>}/>
 <Route path="vehicles/:id" element={<Gate roles={ADMIN} permission="vehicles.manage"><VehicleDetails/></Gate>}/>
 <Route path="drivers" element={<Gate roles={ADMIN} permission="drivers.manage"><Drivers/></Gate>}/>
 <Route path="drivers/new" element={<Gate roles={ADMIN} permission="drivers.manage"><CreateDriver/></Gate>}/>
 <Route path="assignments" element={<Gate roles={ADMIN} permission="assignments.manage"><Assignments/></Gate>}/>
 <Route path="trips" element={<Gate roles={ADMIN} permission="trips.view"><Trips/></Gate>}/>
 <Route path="trips/:id" element={<Gate roles={ADMIN} permission="trips.view"><TripDetails/></Gate>}/>
 <Route path="tracking" element={<Gate roles={ADMIN} permission="locations.view"><Tracking/></Gate>}/>
 <Route path="attendance" element={<Gate roles={ADMIN} permission="attendance.manage"><Attendance/></Gate>}/>
 <Route path="payroll" element={<Gate roles={ADMIN} permission="payroll.manage"><Payroll/></Gate>}/>
 <Route path="payments" element={<Gate roles={ADMIN} permission="payments.manage"><Payments/></Gate>}/>
 <Route path="expenses" element={<Gate roles={ADMIN} permission="expenses.manage"><Expenses/></Gate>}/>
 <Route path="analytics" element={<Gate roles={ADMIN} permission="analytics.view"><Analytics/></Gate>}/><Route path="analytics/details" element={<Gate roles={ADMIN} permission="analytics.view"><AnalyticsDetailed/></Gate>}/>
 <Route path="audit" element={<Gate roles={ADMIN} permission="audit.view"><Audit/></Gate>}/>
 <Route path="driver" element={<Gate roles={['DRIVER']}><DriverDuty/></Gate>}/>
 <Route path="driver/trips" element={<Gate roles={['DRIVER']}><Trips driver/></Gate>}/>
 <Route path="driver/trips/:id" element={<Gate roles={['DRIVER']}><TripDetails/></Gate>}/>
 <Route path="driver/documents" element={<Gate roles={['DRIVER']}><DriverDocuments/></Gate>}/>
 <Route path="driver/attendance" element={<Gate roles={['DRIVER']}><Attendance driver/></Gate>}/>
 <Route path="driver/earnings" element={<Gate roles={['DRIVER']}><DriverEarnings/></Gate>}/>
 <Route path="ride" element={<Gate roles={['CUSTOMER']}><Booking/></Gate>}/>
 <Route path="my-trips" element={<Gate roles={['CUSTOMER']}><Trips customer/></Gate>}/>
 <Route path="my-trips/:id" element={<Gate roles={['CUSTOMER']}><TripDetails/></Gate>}/>
 <Route path="my-places" element={<Gate roles={['CUSTOMER']}><Places/></Gate>}/>
 <Route path="profile" element={<Gate roles={['CUSTOMER']}><Profile/></Gate>}/>
 <Route path="notifications" element={<Notifications/>}/>
 </Route><Route path="*" element={<Start/>}/></Routes>}
export default function App(){return <AuthProvider><BrowserRouter>{import.meta.env.VITE_GOOGLE_MAPS_KEY?<WithMaps><Router/></WithMaps>:<Router/>}</BrowserRouter></AuthProvider>}
