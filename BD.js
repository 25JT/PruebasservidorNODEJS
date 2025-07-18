import mysql from "mysql2/promise";
import dotenv from 'dotenv';
dotenv.config();

 export const BD = await mysql.createConnection({
    host: process.env.host,
    user: process.env.user,
    password: process.env.password,
    database: process.env.database
});

BD.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos');
});

export default BD;



