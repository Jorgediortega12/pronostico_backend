const User = require('../models/user.model');

// Datos de ejemplo (simulando una base de datos)
let users = [
  new User(1, 'Juan Pérez', 'juan@example.com'),
  new User(2, 'María García', 'maria@example.com')
];

class UserService {
  getAllUsers() {
    return users;
  }

  getUserById(id) {
    return users.find(user => user.id === parseInt(id));
  }
}

module.exports = new UserService();
