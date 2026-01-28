import React, { useState, useEffect } from 'react';
// ELIMINADA LA LÍNEA QUE DABA ERROR (lucide-react)

// Importamos Firebase
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// --- TUS CLAVES DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA3NIor3T-VbUC9SfzSgYP7DxirH8leeSo",
  authDomain: "sei-europa-mantenimiento.firebaseapp.com",
  projectId: "sei-europa-mantenimiento",
  storageBucket: "sei-europa-mantenimiento.firebasestorage.app",
  messagingSenderId: "1001646514383",
  appId: "1:1001646514383:web:c697e9cf7881dcfc5e17ba",
  measurementId: "G-5EHHWX4MQR",
};

// Iniciamos la conexión
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function App() {
  const [userRole, setUserRole] = useState(null); 
  const [pin, setPin] = useState('');

  const handleLogin = async () => {
    if (pin === '1234') setUserRole('teacher');
    else if (pin === '5678') setUserRole('admin');
    else if (pin === '9999') setUserRole('staff');
    else return alert('PIN Incorrecto');
    
    try { await signInAnonymously(auth); } catch (e) { console.error(e); }
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-blue-900 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-blue-900 mb-6">Mantenimiento SEI</h1>
          <input 
            type="tel" value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="PIN ACCESO"
            className="w-full text-center text-3xl border-2 rounded-lg p-3 mb-4" maxLength={4}
          />
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">ENTRAR</button>
          <p className="mt-4 text-xs text-gray-400">1234: Profe | 9999: Mantenimiento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-20">
      <nav className="bg-blue-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow">
        <div className="font-bold text-lg">
           {userRole === 'teacher' && '👤 '}
           {userRole === 'staff' && '🛠️ '}
           {userRole === 'admin' && '🛡️ '}
           Mantenimiento
        </div>
        <button onClick={() => setUserRole(null)} className="text-sm bg-blue-800 px-3 py-1 rounded">🚪 Salir</button>
      </nav>

      <main className="p-4 max-w-md mx-auto">
        {userRole === 'teacher' && <TeacherView />}
        {userRole === 'staff' && <StaffView />}
        {userRole === 'admin' && <AdminView />}
      </main>
    </div>
  );
}

function TeacherView() {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [photo, setPhoto] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert('Escribe qué pasa');
    try {
      await addDoc(collection(db, 'tasks'), {
        title, priority, creationPhoto: photo, status: 'pending', createdAt: serverTimestamp(), createdBy: 'Profesor'
      });
      alert('¡Enviado!'); setTitle(''); setPhoto(null);
    } catch (err) { alert('Error: ' + err.message); }
  };

    // --- VERSIÓN MEJORADA (COMPRIME LA PHOTO) ---
  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          // 1. Crear un lienzo virtual
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          const scaleSize = MAX_WIDTH / img.width;
          
          // 2. Redimensionar
          if (img.width > MAX_WIDTH) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scaleSize;
          } else {
             canvas.width = img.width;
             canvas.height = img.height;
          }

          // 3. Dibujar y Comprimir
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          // 4. Guardar
          setIncidencia({ ...incidencia, photo: compressedDataUrl });
        };
      };
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <label className="font-bold block mb-2">¿Qué ha pasado?</label>
        <textarea className="w-full border p-2 rounded" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ej: Puerta rota..." />
      </div>
      <div className="bg-white p-4 rounded shadow">
        <label className="font-bold block mb-2">Urgencia</label>
        <div className="flex gap-2">
           {['low','medium','high'].map(p => (
             <button key={p} type="button" onClick={()=>setPriority(p)} 
               className={`flex-1 py-2 rounded capitalize ${priority===p ? 'bg-blue-600 text-white':'bg-gray-100'}`}>
               {p==='high'?'🚨 Alta':p==='medium'?'⚠️ Media':'🟢 Baja'}
             </button>
           ))}
        </div>
      </div>
      <div className="bg-white p-4 rounded shadow text-center">
         <label className="block w-full p-4 border-2 border-dashed border-blue-300 rounded cursor-pointer">
            <div className="text-2xl mb-1">📷</div>
            <span className="text-blue-600 font-bold">{photo ? 'Foto Lista' : 'Adjuntar Foto'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
         </label>
         {photo && <img src={photo} className="mt-2 h-24 w-full object-cover rounded"/>}
      </div>
      <button className="w-full bg-green-600 text-white font-bold py-3 rounded shadow">ENVIAR AVISO</button>
    </form>
  );
}

function StaffView() {
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [evidence, setEvidence] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, s => setTasks(s.docs.map(d => ({id:d.id, ...d.data()}))));
  }, []);

  const finishTask = async () => {
    if(!evidence) return alert('Falta foto prueba');
    await updateDoc(doc(db, 'tasks', selected.id), { status:'completed', completionPhoto: evidence });
    setSelected(null); setEvidence(null);
  };

  const handleFile = (e) => {
      const file = e.target.files[0];
      if(file){
          const reader = new FileReader();
          reader.onloadend = () => setEvidence(reader.result);
          reader.readAsDataURL(file);
      }
  };

  if(selected) return (
    <div className="bg-white p-4 rounded shadow space-y-4">
       <button onClick={()=>setSelected(null)} className="text-gray-500">🔙 Volver</button>
       <h2 className="font-bold text-xl">{selected.title}</h2>
       {selected.creationPhoto && <img src={selected.creationPhoto} className="w-full h-40 object-cover rounded"/>}
       <div className="border-t pt-4">
          <p className="font-bold mb-2">Validar Trabajo:</p>
          <label className="block w-full p-3 border border-dashed rounded text-center mb-3 cursor-pointer">
             <div>📸</div> {evidence ? 'Evidencia Lista' : 'Subir Foto Final'}
             <input type="file" accept="image/*" className="hidden" onChange={handleFile}/>
          </label>
          <button onClick={finishTask} className="w-full bg-blue-600 text-white py-2 rounded font-bold">TERMINAR TAREA</button>
       </div>
    </div>
  );

  return (
    <div className="space-y-3">
       <h2 className="font-bold text-gray-700">Pendientes</h2>
       {tasks.filter(t=>t.status==='pending').map(t => (
         <div key={t.id} className="bg-white p-4 rounded shadow border-l-4 border-blue-500 flex justify-between items-center">
            <div>
               <div className="font-bold">{t.title}</div>
               <div className="text-xs text-gray-500">{t.priority === 'high' ? '🚨 Urgente' : 'Normal'}</div>
            </div>
            <button onClick={()=>setSelected(t)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold">Ver</button>
         </div>
       ))}
       {tasks.filter(t=>t.status==='pending').length===0 && <p className="text-center text-gray-400 mt-10">👍 Todo limpio</p>}
    </div>
  );
}

function AdminView() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, s => setTasks(s.docs.map(d => ({id:d.id, ...d.data()}))));
  }, []);

  return (
    <div className="space-y-2">
       <h2 className="font-bold mb-4">Historial</h2>
       {tasks.map(t => (
         <div key={t.id} className={`p-3 rounded flex justify-between ${t.status==='completed'?'bg-gray-200 opacity-60':'bg-white shadow'}`}>
            <span>{t.title}</span>
            <span>{t.status==='completed'?'✅':'⏳'}</span>
         </div>
       ))}
    </div>
  );
}
