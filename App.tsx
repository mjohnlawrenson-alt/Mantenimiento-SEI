import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import * as XLSX from 'xlsx';

// TUS LLAVES Y LOGO
import { db } from './misllaves'; 
import logo from './assets/logo.png'; 

const app = getApp(); 
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- LISTA DE ADMINS (JEFES) ---
// Estos usuarios pueden VER el panel Y TAMBIÉN añadir incidencias.
const ADMIN_EMAILS = [
  'mlawrenson@colegioeuropa.com',
  'pdewhurst@colegioeuropa.com',
  'azarraga@colegioeuropa.com',
  'TU_CORREO_DE_PRUEBA_AQUI@GMAIL.COM' // <--- ¡MANTÉN TU CORREO AQUÍ PARA SEGUIR PROBANDO TÚ!
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home'); // home | form | admin | success
  
  // Datos del formulario
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);

  // 1. ESCUCHAR LOGIN
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Si es Admin, le mandamos al Panel de Control
        if (ADMIN_EMAILS.includes(currentUser.email || '')) {
          setIsAdmin(true);
          setView('admin');
          loadIncidents(); 
        } else {
          // Si es Profe, directo al formulario
          setIsAdmin(false);
          setView('form');
        }
      } else {
        setUser(null);
        setView('home');
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. LOGIN / LOGOUT
  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { alert("Error de conexión con Google"); }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('home');
  };

  // 3. CARGAR DATOS (Solo Admin)
  const loadIncidents = async () => {
    try {
      const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncidents(data);
    } catch (e) { console.error(e); }
  };

  // 4. EXPORTAR EXCEL
  const exportToExcel = () => {
    const dataToExport = incidents.map(inc => ({
      Fecha: inc.fecha?.toDate ? inc.fecha.toDate().toLocaleString() : '',
      Ubicación: inc.ubicacion,
      Descripción: inc.descripcion,
      Reportado_Por: inc.usuario,
      Email: inc.email,
      Foto: inc.fotoUrl ? "SÍ" : "NO",
      Link_Foto: inc.fotoUrl || ""
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    XLSX.writeFile(wb, "Mantenimiento_Europa.xlsx");
  };

  // 5. ENVIAR FORMULARIO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !description) return alert("Faltan datos");
    
    setIsSubmitting(true);
    try {
      let photoUrl = "";
      if (photo) {
        // Compresión básica
        const img = new Image();
        img.src = URL.createObjectURL(photo);
        await new Promise(r => img.onload = r);
        const canvas = document.createElement('canvas');
        const scale = 800 / img.width;
        canvas.width = 800; canvas.height = img.height * scale;
        canvas.getContext('2d')?.drawImage(img,0,0,canvas.width,canvas.height);
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.7));
        
        if(blob) {
          const snapshot = await uploadBytes(ref(storage, `fotos/${Date.now()}.jpg`), blob);
          photoUrl = await getDownloadURL(snapshot.ref);
        }
      }

      await addDoc(collection(db, "incidencias"), {
        ubicacion: location,
        descripcion: description,
        fotoUrl: photoUrl,
        fecha: Timestamp.now(),
        usuario: user.displayName,
        email: user.email
      });

      // ÉXITO
      setView('success');
      
      // LÓGICA DIFERENTE PARA ADMINS
      setTimeout(() => {
        if (isAdmin) {
          // Si es Admin, recargamos la lista y volvemos al panel (NO cerramos sesión)
          setLocation(''); setDescription(''); setPhoto(null);
          loadIncidents();
          setView('admin');
        } else {
          // Si es Profe, cerramos sesión y adiós
          handleLogout();
        }
      }, 2500);

    } catch (error) {
      alert("Error al subir");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- VISTAS ---

  // LOGIN
  if (view === 'home') {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center'}}>
          <img src={logo} alt="Logo" style={styles.logo} />
          <h1 style={styles.title}>Mantenimiento</h1>
          <h2 style={styles.subtitle}>Colegio Europa</h2>
          <button onClick={handleLogin} style={styles.googleBtn}>Entrar con Google</button>
        </div>
      </div>
    );
  }

  // ÉXITO
  if (view === 'success') {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center', marginTop: '50px'}}>
          <div style={{fontSize: '60px'}}>✅</div>
          <h2 style={{color: '#2e7d32'}}>¡Registrado!</h2>
          <p>Gracias por registrar su incidencia.</p>
          {isAdmin ? <p>Volviendo al panel...</p> : <p>Cerrando sesión...</p>}
        </div>
      </div>
    );
  }

  // ADMIN PANEL
  if (view === 'admin') {
    return (
      <div style={styles.adminContainer}>
        <div style={styles.header}>
          <h3>Panel de Control</h3>
          <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
        </div>
        
        <div style={styles.adminBar}>
          <button onClick={() => setView('form')} style={styles.addBtn}>
            ➕ Nueva Incidencia
          </button>
          <button onClick={exportToExcel} style={styles.excelBtn}>
            📥 Excel
          </button>
        </div>

        <div style={styles.list}>
          {incidents.map(inc => (
            <div key={inc.id} style={styles.card}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>{inc.ubicacion}</strong>
                <small>{inc.fecha?.toDate ? inc.fecha.toDate().toLocaleDateString() : ''}</small>
              </div>
              <p>{inc.descripcion}</p>
              <small style={{color:'#004481'}}>👤 {inc.usuario}</small>
              {inc.fotoUrl && <div style={{marginTop:'5px'}}><a href={inc.fotoUrl} target="_blank" rel="noreferrer">📷 Ver Foto</a></div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // FORMULARIO (Profesores y Admins cuando le dan al botón)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {isAdmin ? 
          <button onClick={() => setView('admin')} style={{...styles.logoutBtn, background:'#666'}}>🔙 Volver</button> 
          : <span>Hola, {user.displayName?.split(' ')[0]}</span>
        }
        <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
      </div>

      <h2 style={{color: '#004481'}}>Nueva Incidencia</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
        <input value={location} onChange={e => setLocation(e.target.value)} style={styles.input} placeholder="Ubicación (Ej. Aula 4)" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} style={styles.textarea} placeholder="Descripción del problema..." />
        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)} style={styles.input} />
        <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>{isSubmitting ? 'ENVIANDO...' : 'REGISTRAR AVISO'}</button>
      </form>
    </div>
  );
}

// ESTILOS
const styles: any = {
  container: { maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  adminContainer: { maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  logo: { maxWidth: '180px', marginBottom: '20px' },
  title: { color: '#004481', margin: '0' },
  subtitle: { color: '#555', margin: '5px 0 30px 0' },
  googleBtn: { backgroundColor: '#4285F4', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  logoutBtn: { backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' },
  adminBar: { backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', display:'flex', justifyContent:'space-between' },
  addBtn: { backgroundColor: '#004481', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold' },
  excelBtn: { backgroundColor: '#2e7d32', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight:'bold' },
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  card: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom:'10px' },
  textarea: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minHeight: '100px', boxSizing: 'border-box' },
  submitBtn: { backgroundColor: '#004481', color: 'white', border: 'none', padding: '15px', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', width: '100%' }
};

export default App;
