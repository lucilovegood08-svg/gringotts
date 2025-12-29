// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // para servir tu HTML y JS

// Base de datos SQLite
const db = new sqlite3.Database('./gringotts.db');

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    balance INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
});

// Rutas
app.post('/register', (req, res) => {
  const { username, password, role } = req.body;
  const hash = bcrypt.hashSync(password, 8);

  db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
    [username, hash, role],
    function(err) {
      if (err) return res.json({ error: 'Usuario ya existe' });
      res.json({ message: 'Cuenta creada', userId: this.lastID });
    });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (!row) return res.json({ error: 'Usuario no encontrado' });

    if (!bcrypt.compareSync(password, row.password)) {
      return res.json({ error: 'Contraseña incorrecta' });
    }

    res.json({
      message: 'Login exitoso',
      role: row.role,
      balance: row.balance,
      userId: row.id
    });
  });
});

// Agregar galeones (solo admin)
app.post('/add-galeones', (req, res) => {
  const { username, amount } = req.body;
  db.run(`UPDATE users SET balance = balance + ? WHERE username = ?`, [amount, username], function(err) {
    if (err) return res.json({ error: 'Error al cargar galeones' });
    if (this.changes === 0) return res.json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Galeones cargados' });
  });
});

// Crear producto (solo admin)
app.post('/create-product', (req, res) => {
  const { name, price } = req.body;
  db.run(`INSERT INTO products (name, price) VALUES (?, ?)`, [name, price], function(err) {
    if (err) return res.json({ error: 'Error al crear producto' });
    res.json({ message: 'Producto creado', productId: this.lastID });
  });
});

// Ver productos
app.get('/products', (req, res) => {
  db.all(`SELECT * FROM products`, [], (err, rows) => {
    res.json(rows);
  });
});

// Comprar producto
app.post('/buy', (req, res) => {
  const { username, productId } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user) return res.json({ error: 'Usuario no encontrado' });

    db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, product) => {
      if (!product) return res.json({ error: 'Producto no encontrado' });
      if (user.balance < product.price) return res.json({ error: 'No hay suficientes galeones' });

      // Restar galeones
      db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [product.price, user.id]);

      // Agregar al inventario
      db.get(`SELECT * FROM inventory WHERE user_id = ? AND product_id = ?`, [user.id, productId], (err, inv) => {
        if (inv) {
          db.run(`UPDATE inventory SET quantity = quantity + 1 WHERE id = ?`, [inv.id]);
        } else {
          db.run(`INSERT INTO inventory (user_id, product_id) VALUES (?, ?)`, [user.id, productId]);
        }
      });

      res.json({ message: 'Compra exitosa', newBalance: user.balance - product.price });
    });
  });
});

// Ver inventario
app.get('/inventory/:username', (req, res) => {
  const username = req.params.username;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user) return res.json([]);

    db.all(`
      SELECT i.id, p.name, i.quantity 
      FROM inventory i 
      JOIN products p ON i.product_id = p.id
      WHERE i.user_id = ?
    `, [user.id], (err, rows) => {
      res.json(rows);
    });
  });
});

// Usar producto
app.post('/use', (req, res) => {
  const { username, productId } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (!user) return res.json({ error: 'Usuario no encontrado' });

    db.get(`SELECT * FROM inventory WHERE id = ? AND user_id = ?`, [productId, user.id], (err, inv) => {
      if (!inv) return res.json({ error: 'Producto no en inventario' });

      if (inv.quantity > 1) {
        db.run(`UPDATE inventory SET quantity = quantity - 1 WHERE id = ?`, [inv.id]);
      } else {
        db.run(`DELETE FROM inventory WHERE id = ?`, [inv.id]);
      }

      res.json({ message: `Usaste ${inv.id}` });
    });
  });
});

// Ver usuarios (solo admin)
app.get('/users', (req, res) => {
  db.all(`SELECT id, username, role, balance FROM users`, [], (err, rows) => {
    res.json(rows);
  });
});

// Borrar usuario (solo admin)
app.post('/delete-user', (req, res) => {
  const { userId } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
    if (err) return res.json({ error: 'Error al borrar usuario' });
    res.json({ message: 'Usuario borrado' });
  });
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
