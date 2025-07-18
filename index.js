import express from 'express';
import BD from './BD.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import transporter from './correo.js';


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

    const insertUsuario = `
      INSERT INTO usuarios (id, nombre, apellidos, usuario, contrasena)
      VALUES (?, ?, ?, ?, ?)
    `;
    await BD.query(insertUsuario, [usuario_id, nombre, apellidos, usuario, hash]);

    const insertContacto = `
      INSERT INTO contactos (id, usuario_id, correo, telefono)
      VALUES (?, ?, ?, ?)
    `;
    await BD.query(insertContacto, [contacto_id, usuario_id, correo_contacto, telefono]);

    const insertCita = `
      INSERT INTO citas (id, usuario_id, fecha, hora)
      VALUES (?, ?, ?, ?)
    `;
    await BD.query(insertCita, [cita_id, usuario_id, fecha_cita, hora_cita]);

    console.log('✅ Todo insertado correctamente');
    res.json({ mensaje: 'Registro completo exitoso ✅' });
  } catch (err) {
    console.error('❌ Error general:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener citas
app.get('/api/citas', async (req, res) => {
  try {
    const [result] = await BD.query(`
      SELECT 
        u.nombre, u.apellidos, u.usuario,
        c.correo, c.telefono, ci.id,
        ci.fecha, ci.hora
      FROM usuarios u
      JOIN contactos c ON u.id = c.usuario_id
      JOIN citas ci ON u.id = ci.usuario_id;
    `);
    res.json(result);
  } catch (err) {
    console.error('❌ Error al obtener citas:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// Eliminar cita
app.delete('/api/citas/eliminar', async (req, res) => {
  const { id } = req.body;
  try {
    await BD.query(`DELETE FROM citas WHERE id = ?`, [id]);
    res.json({ mensaje: 'Cita eliminada exitosamente ✅' });
  } catch (err) {
    console.error('❌ Error al eliminar cita:', err);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

// Actualizar cita
app.put('/api/citas/actualizar', async (req, res) => {
  const { id, fecha, hora } = req.body;
  try {
    await BD.query(`UPDATE citas SET fecha = ?, hora = ? WHERE id = ?`, [fecha, hora, id]);
    res.json({ mensaje: 'Cita actualizada exitosamente ✅' });
  } catch (err) {
    console.error('❌ Error al actualizar cita:', err);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// Enviar correo
app.post('/api/enviarCorreo', (req, res) => {
  const { correo } = req.body;

  const mailOptions = {
    from: process.env.correoUser,
    to: correo,
    subject: 'Asunto del correo pruebas',
    text: 'Contenido del mensaje',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Error al enviar correo:', error);
      return res.status(500).json({ error: 'Error al enviar correo' });
    }
    console.log('✅ Correo enviado:', info.response);
    res.json({ mensaje: 'Correo enviado exitosamente ✅' });
  });
});

// Recordatorio citas
async function verificarYCitar() {
  try {
    const [citas] = await BD.query(`
      SELECT c.id, c.fecha, c.hora, con.correo
      FROM citas c
      JOIN contactos con ON c.usuario_id = con.usuario_id
      WHERE c.estado = 'pendiente' AND (c.notificada IS NULL OR c.notificada = FALSE)
    `);

    if (!Array.isArray(citas) || citas.length === 0) {
  //   console.log("⏳ No hay citas pendientes próximas por notificar.");
      return;
    }

    const ahora = new Date();

    for (const cita of citas) {
      const fechaStr = new Date(cita.fecha).toISOString().split('T')[0]; 
      const horaStr = cita.hora.slice(0, 5); 
      const citaFechaHora = new Date(`${fechaStr}T${horaStr}:00`);
      const diferenciaMin = (citaFechaHora - ahora) / (1000 * 60);
     
      // Ignorar citas pasadas
      if (diferenciaMin < 0) {
        console.log(`⏭️ Cita ya pasó y será eliminada: ${cita.correo} | ${cita.hora} (${diferenciaMin.toFixed(2)} min atrás)`);
      
        try {
          await BD.query(`DELETE FROM citas WHERE id = ?`, [cita.id]);
          console.log(`🗑️ Cita eliminada correctamente (ID: ${cita.id})`);
        } catch (err) {
          console.error(`❌ Error al eliminar la cita pasada (ID: ${cita.id}):`, err);
        }
      
        continue;
      }
      
      console.log(`📧 ${cita.correo} | ⏰ ${cita.hora} | Diferencia: ${diferenciaMin.toFixed(2)} min`);

      // Validar si está entre 59 y 61 minutos antes
      if (diferenciaMin >= 59 && diferenciaMin <= 61) {
        const mailOptions = {
          from: process.env.correoUser,
          to: cita.correo,
          subject: 'Recordatorio de cita 📅',
          text: `Hola, este es un recordatorio de tu cita programada para hoy a las ${cita.hora}.`,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`✅ Correo enviado a ${cita.correo} para cita a las ${cita.hora}`);

          // Marcar como notificada
          await BD.query(`UPDATE citas SET notificada = TRUE WHERE id = ?`, [cita.id]);
        } catch (err) {
          console.error(`❌ Error al enviar correo a ${cita.correo}:`, err);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error al verificar y enviar recordatorios:', error);
  }
}

// Ejecutar cada minuto (recomiendo usar 60 * 1000 en producción)
setInterval(verificarYCitar, 10 * 1000);

//setInterval(verificarYCitar, 30 * 60 * 1000); // Verificar cada 30 minutos 

