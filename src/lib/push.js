import {initializeApp,getApps} from 'firebase/app';import {getMessaging,getToken,isSupported} from 'firebase/messaging';import {api} from './api';
const config={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
export async function enablePush(){
 if(!config.apiKey||!config.messagingSenderId||!import.meta.env.VITE_FIREBASE_VAPID_KEY)throw Error('Firebase web push is not configured');
 if(!('serviceWorker' in navigator)||!await isSupported())throw Error('This browser does not support FCM web notifications');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notifications are not allowed in this browser');
 const app=getApps()[0]||initializeApp(config),messaging=getMessaging(app);
 const registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{type:'module',scope:'/'});
 const token=await getToken(messaging,{vapidKey:import.meta.env.VITE_FIREBASE_VAPID_KEY,serviceWorkerRegistration:registration});if(!token)throw Error('Firebase did not return a device token');
 await api.post('/notifications/device',{token,platform:'web'});return true;
}
