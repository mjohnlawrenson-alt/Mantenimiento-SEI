import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, orderBy, query, Timestamp, doc, updateDoc } from "firebase/firestore"; // <--- AÑADIDO updateDoc y doc
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import * as XLSX from 'xlsx';

import { db } from './misllaves';
import logo from './assets/colegio.png';

const app = getApp();
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- LISTA DE ADMINS Y MANTENIMIENTO ---
// CUALQUIER correo que pongas aquí podrá ver la lista y los botones de completar.
const ADMIN_EMAILS = [
  'mlawrenson@colegioeuropa.com',
  'pdewhurst@colegioeuropa.com',
  'azarraga@colegioeuropa.com',
  'mantenimiento.europa.app@gmail.com', // <--- EJEMPLO: Pon aquí el correo que usen ellos
  'TU_CORREO_DE_PRUEBA_AQUI@GMAIL.COM' 
];

function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home');
  
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Si el correo está en la lista, es Admin/Mantenimiento
        if (ADMIN_EMAILS.includes(currentUser.email || '')) {
          setIsAdmin(true);
          setView('admin');
          loadIncidents();
        } else {
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

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (error) { alert("Error de conexión"); }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('home');
  };

  const loadIncidents = async () => {
    try {
      const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncidents(data);
    } catch (e) { console.error(e); }
  };

  // --- NUEVA FUNCIÓN: CAMBIAR ESTADO ---
  const updateStatus = async (id: string, nuevoEstado: string) => {
    try {
      const incidenciaRef = doc(db, "incidencias", id);
      await updateDoc(incidenciaRef, {
        estado: nuevoEstado
      });
      // Recargamos la lista para ver el cambio
      loadIncidents();
    } catch (error) {
      alert("Error al actualizar estado");
    }
  };

  const exportToExcel = () => {
    const dataToExport = incidents.map(inc => ({
      Fecha: inc.fecha?.toDate ? inc.fecha.toDate().toLocaleString() : '',
      Ubicación: inc.ubicacion,
      Descripción: inc.descripcion,
      Estado: inc.estado || "Pendiente", // <--- AÑADIDO al Excel
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !description) return alert("Faltan datos");
    
    setIsSubmitting(true);
    try {
      let photoUrl = "";
      if (photo) {
        /* ... Lógica de compresión de imagen igual que antes ... */
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
        email: user.email,
        estado: "Pendiente" // <--- Estado inicial
      });

      setView('success');
      
      setTimeout(() => {
        if (isAdmin) {
          setLocation(''); setDescription(''); setPhoto(null);
          loadIncidents();
          setView('admin');
        } else {
          handleLogout();
        }
      }, 2500);

    } catch (error) {
      alert("Error al subir");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- AYUDA VISUAL PARA EL ESTADO ---
  const getStatusStyle = (estado: string) => {
    switch(estado) {
      case 'Completada': return { borderLeft: '5px solid #2e7d32', bg: '#e8f5e9' }; // Verde
      case 'Programada': return { borderLeft: '5px solid #ff9800', bg: '#fff3e0' }; // Naranja
      case 'Ayuda Externa': return { borderLeft: '5px solid #d32f2f', bg: '#ffebee' }; // Rojo
      default: return { borderLeft: '5px solid #999', bg: 'white' }; // Pendiente (Gris)
    }
  };

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
          {incidents.map(inc => {
            const statusStyle = getStatusStyle(inc.estado);
            return (
              <div key={inc.id} style={{...styles.card, borderLeft: statusStyle.borderLeft, backgroundColor: statusStyle.bg}}>
                
                {/* CABECERA DE LA TARJETA */}
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <strong>{inc.ubicacion}</strong>
                  <small>{inc.fecha?.toDate ? inc.fecha.toDate().toLocaleDateString() : ''}</small>
                </div>

                {/* CUERPO */}
                <p style={{margin:'10px 0'}}>{inc.descripcion}</p>
                
                {/* INFORMACIÓN EXTRA */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:'#666'}}>
                  <span>👤 {inc.usuario}</span>
                  {inc.fotoUrl && <a href={inc.fotoUrl} target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>📷 Ver Foto</a>}
                </div>

                {/* --- SECCIÓN DE ACCIONES DE MANTENIMIENTO --- */}
                <div style={{marginTop:'15px', paddingTop:'10px', borderTop:'1px solid #ccc'}}>
                  <p style={{margin:'0 0 5px 0', fontSize:'0.8rem', fontWeight:'bold'}}>
                    Estado actual: {inc.estado || "Pendiente"}
                  </p>
                  <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                    <button onClick={() => updateStatus(inc.id, 'Completada')} style={styles.statusBtnGreen}>
                      ✅ Completada
                    </button>
                    <button onClick={() => updateStatus(inc.id, 'Programada')} style={styles.statusBtnOrange}>
                      📅 Programada
                    </button>
                    <button onClick={() => updateStatus(inc.id, 'Ayuda Externa')} style={styles.statusBtnRed}>
                      🆘 Ayuda
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- VISTA FORMULARIO (PROFESORES) ---
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
  card: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', background: 'white' },
  input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', marginBottom:'10px' },
  textarea: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minHeight: '100px', boxSizing: 'border-box' },
  submitBtn: { backgroundColor: '#004481', color: 'white', border: 'none', padding: '15px', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', width: '100%' },
  // NUEVOS ESTILOS PARA BOTONES
  statusBtnGreen: { backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' },
  statusBtnOrange: { backgroundColor: '#fff3e0', color: '#ef6c00', border: '1px solid #ef6c00', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' },
  statusBtnRed: { backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #c62828', padding: '5px 10px', borderRadius: '15px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }
};

export default App;
