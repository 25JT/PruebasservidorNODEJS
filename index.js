// index.js o index.mjs
import express from 'express';
import BD from './BD.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

BD.connect();

//contraseñas saltos para encriptar
const saltRounds = 10;
const ruta = "http://localhost:3000";


const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.get('/', (req, res) => {
  res.send('Servidor Express con módulos ES funcionando 🚀🔥🔥');
});

app.get('/api/frase', (req, res) => {
  res.json({ mensaje: 'Hola desde el backend 👋' });
});

app.get('/api/notas', (req, res) => {
  res.json({ mensaje: 'NOTA BACK 👋' });
});


app.listen(3000, () => {
  console.log(`Servidor en ${ruta}`);
});

app.post('/api/registro', async (req, res) => {
  try {
    const {
      nombre,
      apellidos,
      usuario,
      contrasena,
      correo_contacto,
      telefono,
      fecha_cita,
      hora_cita
    } = req.body;

    const hash = await bcrypt.hash(contrasena, saltRounds);
    const usuario_id = uuidv4();
    const contacto_id = uuidv4();
    const cita_id = uuidv4();

    // 1. Insertar usuario
    const insertUsuario = `
      INSERT INTO usuarios (id, nombre, apellidos, usuario, contrasena)
      VALUES (?, ?, ?, ?, ?)
    `;
    BD.query(insertUsuario, [usuario_id, nombre, apellidos, usuario, hash], (err, resultUsuario) => {
      if (err) {
        console.error('❌ Error insertando usuario:', err);
        return res.status(500).json({ error: 'Error insertando usuario por favor use otro' });
      }

      // 2. Insertar contacto
      const insertContacto = `
        INSERT INTO contactos (id, usuario_id, correo, telefono)
        VALUES (?, ?, ?, ?)
      `;
      BD.query(insertContacto, [contacto_id, usuario_id, correo_contacto, telefono], (err2) => {
        if (err2) {
          console.error('❌ Error insertando contacto:', err2);
          return res.status(500).json({ error: 'Error insertando contacto' });
        }

        // 3. Insertar cita
        const insertCita = `
          INSERT INTO citas (id, usuario_id, fecha, hora)
          VALUES (?, ?, ?, ?)
        `;
        BD.query(insertCita, [cita_id, usuario_id, fecha_cita, hora_cita], (err3) => {
          if (err3) {
            console.error('❌ Error insertando cita:', err3);
            return res.status(500).json({ error: 'Error insertando cita' });
          }

          console.log('✅ Todo insertado correctamente');
          res.json({ mensaje: 'Registro completo exitoso ✅' });
        });
      });
    });
  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

//citas

app.get('/api/citas', (req, res) => {
  const selectCitas = `SELECT 
  u.nombre, u.apellidos, u.usuario,
  c.correo, c.telefono,
  ci.fecha, ci.hora
FROM usuarios u
JOIN contactos c ON u.id = c.usuario_id
JOIN citas ci ON u.id = ci.usuario_id;
`;
  BD.query(selectCitas, (err, result) => {
    if (err) {
      console.error('❌ Error al obtener citas:', err);
      return res.status(500).json({ error: 'Error al obtener citas' });
    }
    res.json(result);
    
    
  });
});


