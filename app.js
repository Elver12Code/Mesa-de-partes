const cors = require('cors'); 
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

const SECRET_KEY = process.env.SECRET_KEY; // Clave secreta para la firma de tokens
// Ruta de Registro
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  // Validar que se haya proporcionado email y contraseña
  if (!email || !password) {
    return res.status(400).json({ error: 'El correo electrónico y la contraseña son obligatorios' });
  }

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Responder con éxito
    res.status(201).json({ message: 'Usuario creado', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'El usuario ya existe o ha ocurrido otro problema' });
  }
});

// Ruta de Logeo
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validar que se haya proporcionado email y contraseña
  if (!email || !password) {
    return res.status(400).json({ error: 'El correo electrónico y la contraseña son obligatorios' });
  }

  try {
    // Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({ where: { email } });

    // Verificar si el usuario existe
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Comparar la contraseña proporcionada con la almacenada
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Crear un token JWT
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });

    // Responder con el token
    res.json({ message: 'Has iniciado sesión', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Algo salió mal' });
  }
});

// Cierre del Prisma Client al finalizar
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`El servidor está funcionando en http://localhost:${PORT}`);
});
