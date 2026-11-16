import axios from 'axios';
export const base=import.meta.env.VITE_API_URL||'http://localhost:8080/api';
export const api=axios.create({baseURL:base,timeout:30000});
api.interceptors.request.use(c=>{const token=localStorage.getItem('periyar_token');if(token)c.headers.Authorization=`Bearer ${token}`;return c});
api.interceptors.response.use(x=>x,err=>{if(err.response?.status===401&&localStorage.getItem('periyar_token')){localStorage.removeItem('periyar_token');localStorage.removeItem('periyar_user');window.dispatchEvent(new Event('periyar:logout'))}return Promise.reject(err)});
export const errText=e=>e.response?.data?.error||e.message||'Something went wrong';
export function loadRazorpay(){return new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(new Error('Unable to load payment gateway'));document.body.append(s)})}
export const currency=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:0});
export const dateTime=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
export const dateInput=v=>{const d=v?new Date(v):new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
