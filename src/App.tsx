import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { getApp } from "firebase/app";
import * as XLSX from 'xlsx';

// IMPORTANTE: Importamos tu configuración y el logo
import { db } from './misllaves'; 
import logo from './assets/logo.png'; 

// Inicializamos los servicios extra (Auth y Storage) usando la app que ya creaste en misllaves
const app = getApp(); 
const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- LISTA DE JEFES (ADMINISTRADORES) ---
// Solo estos correos verán el botón de Excel y la lista.
// ¡AÑADE TU PROPIO CORREO AQUÍ PARA PODER VERLO TÚ TAMBIÉN!
const ADMIN_EMAILS = [
  'mlawrenson@colegioeuropa.com',
  'pdewhurst@colegioeuropa.com',
  'azarraga@colegioeuropa.com',
  'm.johnlawrenson@gmail.com' // <--- CAMBIA ESTO POR TU EMAIL PARA PROBARLO
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

  // 1. ESCUCHAR EL LOGIN
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Comprobamos si el email está en la lista VIP
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

  // 2. FUNCIÓN ENTRAR (LOGIN)
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("Error al entrar. Asegúrate de haber activado Google en la consola de Firebase.");
    }
  };

  // 3. FUNCIÓN SALIR (LOGOUT)
  const handleLogout = () => {
    signOut(auth);
    setView('home');
  };

  // 4. CARGAR DATOS (SOLO ADMINS)
  const loadIncidents = async () => {
    try {
      const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIncidents(data);
    } catch (e) {
      console.error("Error cargando lista", e);
    }
  };

  // 5. EXPORTAR A EXCEL
  const exportToExcel = () => {
    const dataToExport = incidents.map(inc => ({
      Fecha: inc.fecha?.toDate ? inc.fecha.toDate().toLocaleString() : 'Fecha desconocida',
      Ubicación: inc.ubicacion,
      Descripción: inc.descripcion,
      Reportado_Por: inc.usuario,
      Email: inc.email,
      Foto: inc.fotoUrl ? "SÍ (Ver Link)" : "NO",
      Link_Foto: inc.fotoUrl || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    XLSX.writeFile(wb, "Mantenimiento_Europa.xlsx");
  };

  // 6. COMPRIMIR FOTO (Para que no pesen 10MB)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Reducir a 800px
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.7);
      };
      img.onerror = reject;
    });
  };

  // 7. ENVIAR REPORTE (PROFESORES)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !description) return alert("Por favor, rellena ubicación y descripción.");
    
    setIsSubmitting(true);
    try {
      let photoUrl = "";
      // Si hay foto, la comprimimos y subimos
      if (photo) {
        const compressedBlob = await compressImage(photo);
        const storageRef = ref(storage, `fotos/${Date.now()}_img.jpg`);
        const snapshot = await uploadBytes(storageRef, compressedBlob);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      // Guardamos en Base de Datos
      await addDoc(collection(db, "incidencias"), {
        ubicacion: location,
        descripcion: description,
        fotoUrl: photoUrl,
        fecha: Timestamp.now(),
        usuario: user.displayName,
        email: user.email
      });

      // Éxito
      setView('success');
      
      // Logout automático tras 4 segundos
      setTimeout(() => {
        signOut(auth);
        setLocation('');
        setDescription('');
        setPhoto(null);
      }, 4000);

    } catch (error) {
      console.error(error);
      alert("Error al subir. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- VISTAS DE LA PANTALLA ---

  // VISTA 1: LOGIN (PANTALLA INICIAL)
  if (view === 'home') {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center'}}>
          <img src={logo} alt="Logo" style={styles.logo} />
          <h1 style={styles.title}>Mantenimiento</h1>
          <h2 style={styles.subtitle}>Colegio Europa</h2>
          
          <button onClick={handleLogin} style={styles.googleBtn}>
            Acceder con Google
          </button>
          <p style={{marginTop:'20px', color:'#777', fontSize:'13px'}}>
            Profesores y Personal Autorizado
          </p>
        </div>
      </div>
    );
  }

  // VISTA 2: MENSAJE DE GRACIAS
  if (view === 'success') {
    return (
      <div style={styles.container}>
        <div style={{textAlign: 'center', marginTop: '50px'}}>
          <div style={{fontSize: '60px'}}>✅</div>
          <h2 style={{color: '#2e7d32'}}>¡Gracias!</h2>
          <p>Thank you for registering your incident.</p>
          <p style={{marginTop: '20px', color: '#666'}}>
            Cerrando sesión...<br/>Logging out...
          </p>
        </div>
      </div>
    );
  }

  // VISTA 3: ADMINISTRADOR (Michael, Paul, Amaia)
  if (view === 'admin') {
    return (
      <div style={styles.adminContainer}>
        <div style={styles.header}>
          <h3>Panel de Control</h3>
          <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
        </div>
        
        <div style={styles.adminBar}>
          <span>Hola, <strong>{user.displayName}</strong></span>
          <button onClick={exportToExcel} style={styles.excelBtn}>
            📥 Descargar Excel
          </button>
        </div>

        <div style={styles.list}>
          {incidents.map(inc => (
            <div key={inc.id} style={styles.card}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <strong>{inc.ubicacion}</strong>
                <small>{inc.fecha?.toDate ? inc.fecha.toDate().toLocaleDateString() : ''}</small>
              </div>
              <p style={{margin: '8px 0'}}>{inc.descripcion}</p>
              <div style={{fontSize:'12px', color:'#004481'}}>
                👤 {inc.usuario}
              </div>
              {inc.fotoUrl && (
                <div style={{marginTop: '10px'}}>
                  <a href={inc.fotoUrl} target="_blank" rel="noreferrer" style={styles.link}>
                    📷 Ver Foto
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // VISTA 4: FORMULARIO (PROFESORES)
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>Hola, {user.displayName?.split(' ')[0]}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Salir</button>
      </div>

      <h2 style={{color: '#004481', borderBottom:'2px solid #f0f0f0', paddingBottom:'10px'}}>
        Nueva Incidencia
      </h2>

      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
        
        <div>
          <label style={styles.label}>Ubicación / Clase</label>
          <input 
            type="text" 
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={styles.input}
            placeholder="Ej. Aula 4B"
          />
        </div>

        <div>
          <label style={styles.label}>Descripción</label>
          <textarea 
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={styles.textarea}
            placeholder="Describe el problema..."
          />
        </div>

        <div>
          <label style={styles.label}>Foto (Opcional)</label>
          <input 
            type="file" 
            accept="image/*"
            capture="environment"
            onChange={e => setPhoto(e.target.files ? e.target.files[0] : null)}
            style={styles.input}
          />
          {photo && <div style={{color:'green', fontSize:'12px', marginTop:'5px'}}>Foto lista para subir</div>}
        </div>

        <button type="submit" disabled={isSubmitting} style={styles.submitBtn}>
          {isSubmitting ? 'ENVIANDO...' : 'REGISTRAR AVISO'}
        </button>

      </form>
    </div>
  );
}

// --- ESTILOS CSS ---
const styles: any = {
  container: { maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  adminContainer: { maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  logo: { maxWidth: '180px', marginBottom: '20px' },
  title: { color: '#004481', margin: '0' },
  subtitle: { color: '#555', margin: '5px 0 30px 0', fontWeight: 'normal' },
  googleBtn: { backgroundColor: '#4285F4', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  logoutBtn: { backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' },
  input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize:'16px' },
  textarea: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '100px', fontSize:'16px' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' },
  submitBtn: { backgroundColor: '#004481', color: 'white', border: 'none', padding: '15px', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop:'10px' },
  adminBar: { backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  excelBtn: { backgroundColor: '#2e7d32', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' },
  list: { display: 'flex', flexDirection: 'column', gap: '15px' },
  card: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  link: { color: '#004481', textDecoration: 'none', fontWeight: 'bold', border: '1px solid #004481', padding: '2px 8px', borderRadius: '4px', fontSize:'12px' }
};

export default App;
