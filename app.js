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
    const token = jwt.sign({ userId: user.id, role: user.role}, SECRET_KEY, { expiresIn: '1h' });

    if (user.role === 'admin') {
      return res.json({ message: 'Bienvenido Administrador', token, redirectTo: '/panel-control', role: user.role });
    }

    // Responder con el token
    res.json({ message: 'Has iniciado sesión', token, role: user.role });
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

app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // Consulta todos los usuarios
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving users' });
  }
});


// Subir un documento
app.post('/documents', async (req, res) => {
  const { title, description, filePath, userId } = req.body;

  if (!title || !filePath || !userId) {
    return res.status(400).json({ error: 'Título, archivo y usuario son obligatorios' });
  }

  try {
    const newDocument = await prisma.document.create({
      data: {
        title,
        description,
        filePath,
        userId,
      },
    });

    res.status(201).json({ message: 'Documento creado', document: newDocument });
  } catch (error) {
    console.error('Error al crear documento:', error);
    res.status(500).json({ error: 'Error al crear el documento' });
  }
});

// Obtener todos los documentos
app.get('/documents', async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      include: { user: true }, // Incluye información del usuario asociado
    });

    res.json(documents);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
});

// Obtener un documento por ID
app.get('/documents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }, // Incluye información del usuario asociado
    });

    if (!document) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ error: 'Error al obtener el documento' });
  }
});

// Actualizar el estado de un documento
app.put('/documents/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'El estado es obligatorio' });
  }

  try {
    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json({ message: 'Documento actualizado', document: updatedDocument });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({ error: 'Error al actualizar el documento' });
  }
});

// Eliminar un documento
app.delete('/documents/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.document.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
});
