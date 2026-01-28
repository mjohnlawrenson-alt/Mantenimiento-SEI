import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';

// 1. Definimos la forma de los datos (TODO EN INGLÉS: photo)
interface Incidencia {
  id?: string;
  descripcion: string;
  usuario: string;
  fecha?: any;
  photo?: string; // Aquí usamos 'photo'
}

function App() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  // 2. Estado inicial (photo vacío)
  const [incidencia, setIncidencia] = useState<Incidencia>({
    descripcion: '',
    usuario: '',
    photo: '' 
  });
  const [loading, setLoading] = useState(false);

  // Cargar incidencias al inicio
  useEffect(() => {
    const obtenerIncidencias = async () => {
      const q = query(collection(db, "incidencias"), orderBy("fecha", "desc"));
      const querySnapshot = await getDocs(q);
      const datos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Incidencia[];
      setIncidencias(datos);
    };
    obtenerIncidencias();
  }, [loading]);

  // --- COMPRESIÓN DE IMAGEN ---
  const handleFile = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          const scaleSize = MAX_WIDTH / img.width;
          
          if (img.width > MAX_WIDTH) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scaleSize;
          } else {
             canvas.width = img.width;
             canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Comprimir a JPEG 0.7
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          // 3. Guardar en 'photo'
          setIncidencia({ ...incidencia, photo: compressedDataUrl });
        };
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 4. Enviar a Firebase usando 'photo'
      await addDoc(collection(db, "incidencias"), {
        descripcion: incidencia.descripcion,
        fecha: new Date(),
        usuario: incidencia.usuario || "Anónimo",
        photo: incidencia.photo 
      });
      setIncidencia({ descripcion: '', usuario: '', photo: '' });
      alert('¡Incidencia enviada!');
    } catch (error) {
      console.error("Error: ", error);
      alert('Error al enviar');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🛠️ Reporte de Incidencias</h1>
      
      {/* Formulario */}
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Nueva Incidencia</h3>
        <input 
          type="text" 
          placeholder="Tu nombre (ej. Juan)" 
          value={incidencia.usuario}
          onChange={(e) => setIncidencia({...incidencia, usuario: e.target.value})}
          style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%' }}
        />
        <textarea 
          placeholder="Describe el problema..." 
          value={incidencia.descripcion}
          onChange={(e) => setIncidencia({...incidencia, descripcion: e.target.value})}
          style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', height: '80px' }}
        />
        
        <p>Subir foto (Cámara/Galería):</p>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFile}
          style={{ marginBottom: '10px' }}
        />

        {/* 5. PREVISUALIZACIÓN: Si existe photo, muéstrala */}
        {incidencia.photo && (
          <div style={{ margin: '10px 0' }}>
            <p>Previsualización:</p>
            <img src={incidencia.photo} alt="Previsualización" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={loading}
          style={{ 
            backgroundColor: '#0070f3', color: 'white', padding: '10px 20px', 
            border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' 
          }}
        >
          {loading ? 'Enviando...' : 'Guardar Incidencia'}
        </button>
      </div>

      {/* Lista de Incidencias */}
      <h2>Últimas Incidencias</h2>
      {incidencias.map((item) => (
        <div key={item.id} style={{ borderBottom: '1px solid #eee', padding: '15px 0' }}>
          <strong>{item.usuario}</strong> - <small>{item.fecha?.toDate ? item.fecha.toDate().toLocaleString() : 'Fecha desconocida'}</small>
          <p>{item.descripcion}</p>
          
          {/* 6. LISTADO: Si existe photo, muéstrala */}
          {item.photo && (
            <img 
              src={item.photo} 
              alt="Prueba" 
              style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '10px' }} 
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
