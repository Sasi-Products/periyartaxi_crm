const required=['react','react-dom','vite','@vitejs/plugin-react','react-router-dom','axios','firebase/app','firebase/messaging'];
const missing=required.filter((name)=>{try{import.meta.resolve(name);return false}catch{return true}});
if(missing.length){console.error('Periyar Taxi React: dependencies missing: '+missing.join(', '));
  console.error('Run npm install in the frontend project folder first.');process.exitCode=1;}
else console.log('Frontend dependencies found.');
