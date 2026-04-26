const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Usuario admin por defecto
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashed,
        fullName: 'Administrador',
        role: 'ADMIN',
      },
    });
    console.log('✅ Usuario admin creado — usuario: admin / contraseña: admin123');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login.');
  } else {
    console.log('ℹ️  Usuario admin ya existe, omitiendo...');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
