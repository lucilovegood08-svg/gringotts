const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Puerto que Render asigna automáticamente
const PORT = process.env.PORT || 3000;

// Base de datos en memoria
let users = [];
let products = [];
let nextProductId = 1;
let nextInventoryId = 1;

// ------------------ RUTAS ------------------

// Registro
app.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    if(users.find(u => u.username === username)){
        return res.json({ error: 'Usuario ya existe' });
    }
    users.push({ username, password, role, balance:0, products: [] });
    res.json({ message: 'Cuenta creada correctamente' });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if(!user) return res.json({ error: 'Usuario o contraseña incorrecta' });
    res.json({ 
        message: 'Login exitoso', 
        role: user.role,
        balance: user.balance
    });
});

// Agregar galeones (Admin)
app.post('/add-galeones', (req, res) => {
    const { username, amount } = req.body;
    const user = users.find(u => u.username === username);
    if(!user) return res.json({ error: 'Usuario no encontrado' });
    user.balance += amount;
    res.json({ message: `Se agregaron ${amount} galeones a ${username}` });
});

// Crear producto (Admin)
app.post('/create-product', (req, res) => {
    const { name, price } = req.body;
    products.push({ id: nextProductId++, name, price });
    res.json({ message: `Producto ${name} creado` });
});

// Listar productos
app.get('/products', (req, res) => {
    res.json(products);
});

// Comprar producto
app.post('/buy', (req, res) => {
    const { username, productId } = req.body;
    const user = users.find(u => u.username === username);
    const product = products.find(p => p.id === productId);
    if(!user || !product) return res.json({ error: 'Usuario o producto no encontrado' });
    if(user.balance < product.price) return res.json({ error: 'No tienes suficientes galeones' });
    
    user.balance -= product.price;

    // Agregar producto al inventario del usuario
    const invItem = user.products.find(p => p.name === product.name);
    if(invItem) invItem.quantity += 1;
    else user.products.push({ id: nextInventoryId++, name: product.name, quantity: 1 });

    res.json({ message: `Compraste ${product.name}`, newBalance: user.balance });
});

// Ver inventario
app.get('/inventory/:username', (req,res)=>{
    const user = users.find(u => u.username === req.params.username);
    if(!user) return res.json([]);
    res.json(user.products);
});

// Usar producto
app.post('/use', (req,res)=>{
    const { username, productId } = req.body;
    const user = users.find(u => u.username === username);
    if(!user) return res.json({ error: 'Usuario no encontrado' });

    const product = user.products.find(p => p.id === productId);
    if(!product) return res.json({ error: 'Producto no encontrado' });

    product.quantity -= 1;
    if(product.quantity <= 0){
        user.products = user.products.filter(p => p.id !== productId);
    }

    res.json({ message: `Usaste ${product.name}`, newBalance: user.balance });
});

// Listar todos los usuarios (Admin)
app.get('/users', (req,res)=>{
    res.json(users.map(u=>({
        username: u.username,
        balance: u.balance,
        products: u.products
    })));
});

// Borrar usuario (Admin)
app.post('/delete-user', (req,res)=>{
    const { username } = req.body;
    const index = users.findIndex(u=>u.username===username);
    if(index === -1) return res.json({ error: 'Usuario no encontrado' });
    users.splice(index,1);
    res.json({ message: `Usuario ${username} eliminado` });
});

// Iniciar servidor
app.listen(PORT, ()=>{
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
