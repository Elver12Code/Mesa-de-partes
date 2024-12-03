const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@example.com'; 
  const password = 'adminpassword';   
  const role = 'admin'; 

  // Verifica si ya existe un administrador
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: 'admin',
    },
  });

  if (existingAdmin) {
    console.log('Ya existe un administrador.');
    return;
  }

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear un nuevo usuario administrador
    const newAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    console.log(`Administrador creado: ${newAdmin.email}`);
  } catch (error) {
    console.error('Error creando administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
