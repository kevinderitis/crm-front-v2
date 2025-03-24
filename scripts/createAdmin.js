const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/messenger-crm', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const adminData = {
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      full_name: 'Admin User',
      role: 'admin',
      created_at: new Date()
    };

    const adminUser = new User(adminData);
    await adminUser.save();

    console.log('Usuario admin creado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuario admin:', error);
    process.exit(1);
  }
}

createAdminUser();