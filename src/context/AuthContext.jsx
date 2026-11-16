import {createContext,useContext,useEffect,useMemo,useState} from 'react';import {api} from '../lib/api';
const Context=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('periyar_user')||'null')}catch{return null}});const [token,setToken]=useState(localStorage.getItem('periyar_token'));
 useEffect(()=>{const logout=()=>{setUser(null);setToken(null)};window.addEventListener('periyar:logout',logout);return()=>window.removeEventListener('periyar:logout',logout)},[]);
 const login=({token:t,user:u})=>{localStorage.setItem('periyar_token',t);localStorage.setItem('periyar_user',JSON.stringify(u));setToken(t);setUser(u)};
 const logout=()=>{localStorage.removeItem('periyar_token');localStorage.removeItem('periyar_user');setUser(null);setToken(null)};
 const refresh=async()=>{const r=await api.get('/auth/me');setUser(r.data.user);localStorage.setItem('periyar_user',JSON.stringify(r.data.user))};
 const can=p=>{let perms=user?.permissions||[];try{if(typeof perms==='string')perms=JSON.parse(perms)}catch{perms=[]}return user?.role==='SUPER_ADMIN'||(user?.role==='ADMIN'&&Array.isArray(perms)&&perms.includes(p))};
 return <Context.Provider value={{user,token,login,logout,refresh,can}}>{children}</Context.Provider>}
export const useAuth=()=>useContext(Context);
