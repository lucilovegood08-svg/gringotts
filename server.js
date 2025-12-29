const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let users = [];
let products = [];
let nextProductId = 1;

app.post('/register', (req,res)=>{
  const {username,password,role}=req.body;
  if(users.find(u=>u.username===username)){return res.json({error:'Usuario ya existe'});}
  users.push({username,password,role,balance:0,products:[]});
  res.json({message:'Usuario creado'});
});

app.post('/login',(req,res)=>{
  const {username,password}=req.body;
  const user=users.find(u=>u.username===username && u.password===password);
  if(!user) return res.json({error:'Usuario o contraseña incorrecta'});
  res.json({username:user.username,role:user.role,balance:user.balance});
});

app.post('/add-galeones',(req,res)=>{
  const {username,amount}=req.body;
  const user=users.find(u=>u.username===username);
  if(!user) return res.json({error:'Usuario no encontrado'});
  user.balance+=amount;
  res.json({message:`${amount} galeones agregados a ${username}`});
});

app.post('/create-product',(req,res)=>{
  const {name,price}=req.body;
  if(!name || !price) return res.json({error:'Faltan campos'});
  const product={id:nextProductId++, name, price};
  products.push(product);
  res.json({message:`Producto ${name} creado`});
});

app.get('/products',(req,res)=>res.json(products));

app.post('/buy',(req,res)=>{
  const {username,productId}=req.body;
  const user=users.find(u=>u.username===username);
  if(!user) return res.json({error:'Usuario no encontrado'});
  const product=products.find(p=>p.id===productId);
  if(!product) return res.json({error:'Producto no encontrado'});
  if(user.balance<product.price) return res.json({error:'No tenés suficientes galeones'});
  user.balance-=product.price;
  let item=user.products.find(p=>p.id===productId);
  if(item)item.quantity++; else user.products.push({id:productId,name:product.name,quantity:1});
  res.json({message:`Compraste ${product.name}`,newBalance:user.balance});
});

app.get('/inventory/:username',(req,res)=>{
  const user=users.find(u=>u.username===req.params.username);
  if(!user) return res.json([]);
  res.json(user.products);
});

app.post('/use',(req,res)=>{
  const {username,productId}=req.body;
  const user=users.find(u=>u.username===username);
  if(!user) return res.json({error:'Usuario no encontrado'});
  const item=user.products.find(p=>p.id===productId);
  if(!item) return res.json({error:'Producto no en inventario'});
  item.quantity--;
  if(item.quantity<=0) user.products=user.products.filter(p=>p.id!==productId);
  res.json({message:`Usaste ${item.name}`});
});

app.get('/users',(req,res)=>{
  res.json(users.map(u=>({username:u.username,balance:u.balance,products:u.products})));
});

app.post('/delete-user',(req,res)=>{
  const {username}=req.body;
  users=users.filter(u=>u.username!==username);
  res.json({message:'Usuario borrado'});
});

app.listen(3000,()=>console.log('Servidor corriendo en puerto 3000'));
