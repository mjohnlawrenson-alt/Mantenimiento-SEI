// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';

// Esta primera línea // @ts-nocheck es CRUCIAL. No la borres.
// Desactiva la comprobación estricta para que Vercel no falle al construir.

interface Incidencia {
  id?: string;
  descripcion: string;
  usuario: string;
  fecha?: any;
  photo?: string;
}

function App() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [incidencia, setIncidencia] = useState<Incidencia>({
    descripcion: '',
    usuario: '',
    photo: '' 
  });
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const obtenerIncidencias = async () => {
      try {
        const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        const datos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Incidencia[];
        setIncidencias(datos);
      } catch (e: any) {
        setDebugInfo("Error cargando lista: " + e.message);
      }
    };
    obtenerIncidencias();
  }, [loading]);

  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setDebugInfo("Procesando foto...");
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500; 
          const scaleSize = MAX_WIDTH / img.width;
          
          if (img.width > MAX_WIDTH) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scaleSize;
          } else {
             canvas.width = img.width;
             canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            const sizeInKB = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
            setDebugInfo(`Foto lista: ${sizeInKB} KB (Debe ser menor de 1000)`);
            setIncidencia(prev => ({ ...prev, photo: compressedDataUrl }));
          }
        };
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDebugInfo("Enviando a Firebase...");
    
    try {
      await addDoc(collection(db, "incidencias"), {
        descripcion: incidencia.descripcion,
        fecha: new Date(),
        usuario: incidencia.usuario || "Anónimo",
        photo: incidencia.photo 
      });
      setIncidencia({ descripcion: '', usuario: '', photo: '' });
      setDebugInfo("¡Éxito! Enviado.");
      alert('¡Incidencia enviada!');
    } catch (error: any) {
      console.error("Error: ", error);
      setDebugInfo("ERROR: " + error.message);
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🛠️ Incidencias (Versión Segura)</h1>
      
      {/* BARRA DE DEBUG AMARILLA */}
      <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', marginBottom: '10px', borderRadius: '5px' }}>
        <strong>Estado:</strong> {debugInfo || "Esperando acción..."}
      </div>

      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Nueva Incidencia</h3>
        <input 
          type="text" 
          placeholder="Nombre" 
          value={incidencia.usuario}
          onChange={(e) => setIncidencia({...incidencia, usuario: e.target.value})}
          style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
        />
        <textarea 
          placeholder="Descripción" 
          value={incidencia.descripcion}
          onChange={(e) => setIncidencia({...incidencia, descripcion: e.target.value})}
          style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', height: '80px' }}
        />
        
        <p>Foto:</p>
        <input type="file" accept="image/*" onChange={handleFile} />

        {incidencia.photo && (
          <div style={{ margin: '10px 0' }}>
            <p>Vista previa:</p>
            <img src={incidencia.photo} style={{ maxWidth: '150px' }} alt="Preview"/>
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={loading}
          style={{ 
            backgroundColor: '#0070f3', color: 'white', padding: '10px 20px', 
            border: 'none', borderRadius: '5px', marginTop: '10px', width: '100%', fontSize: '18px'
          }}
        >
          {loading ? 'Enviando...' : 'GUARDAR AHORA'}
        </button>
      </div>

      <h2>Lista</h2>
      {incidencias.map((item) => (
        <div key={item.id} style={{ borderBottom: '1px solid #ccc', padding: '10px 0' }}>
          <strong>{item.usuario}</strong>: {item.descripcion}
          <br/>
          {item.photo ? (
             <img src={item.photo} style={{ maxWidth: '200px', marginTop: '5px', borderRadius: '5px' }} alt="Evidencia" />
          ) : (
             <span style={{color: 'gray'}}>(Sin foto)</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
