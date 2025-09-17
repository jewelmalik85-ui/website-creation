const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// LowDB setup (file-based JSON db)
const file = path.join(__dirname, 'data.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data = db.data || { products: [] };
  // seed with sample product if empty
  if (!db.data.products || db.data.products.length === 0) {
    db.data.products = [
      {
        id: nanoid(),
        name: 'Classic White Shirt',
        price: 1499,
        stock: 20,
        imageUrl: '',
        reviews: []
      },
      {
        id: nanoid(),
        name: 'Silk Scarf',
        price: 799,
        stock: 15,
        imageUrl: '',
        reviews: []
      }
    ];
    await db.write();
  }
}
initDB();

// Helper to save db
async function saveDB() { await db.write(); }

// GET all products
app.get('/api/products', async (req, res) => {
  await db.read();
  res.json(db.data.products);
});

// GET single product
app.get('/api/products/:id', async (req, res) => {
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// POST add product
app.post('/api/products', async (req, res) => {
  const { name, price, stock, imageUrl } = req.body;
  const product = { id: nanoid(), name, price, stock: stock || 0, imageUrl: imageUrl || '', reviews: [] };
  await db.read();
  db.data.products.push(product);
  await saveDB();
  res.status(201).json(product);
});

// PUT update product
app.put('/api/products/:id', async (req, res) => {
  const { name, price, stock, imageUrl } = req.body;
  await db.read();
  const idx = db.data.products.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const existing = db.data.products[idx];
  const updated = { ...existing, name: name ?? existing.name, price: price ?? existing.price, stock: stock ?? existing.stock, imageUrl: imageUrl ?? existing.imageUrl };
  db.data.products[idx] = updated;
  await saveDB();
  res.json(updated);
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  await db.read();
  db.data.products = db.data.products.filter(x => x.id !== req.params.id);
  await saveDB();
  res.json({ success: true });
});

// --- Reviews CRUD ---
// POST add review
app.post('/api/products/:id/reviews', async (req, res) => {
  const { user = 'Guest', rating = 5, comment = '', images = [] } = req.body;
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const review = { id: nanoid(), user, rating, comment, images: images || [], date: new Date().toISOString() };
  p.reviews.push(review);
  await saveDB();
  res.status(201).json(review);
});

// PUT edit review
app.put('/api/products/:id/reviews/:rid', async (req, res) => {
  const { user, rating, comment, images } = req.body;
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const rIdx = p.reviews.findIndex(r => r.id === req.params.rid);
  if (rIdx === -1) return res.status(404).json({ error: 'Review not found' });
  const rev = p.reviews[rIdx];
  p.reviews[rIdx] = { ...rev, user: user ?? rev.user, rating: rating ?? rev.rating, comment: comment ?? rev.comment, images: images ?? rev.images, date: new Date().toISOString() };
  await saveDB();
  res.json(p.reviews[rIdx]);
});

// DELETE review
app.delete('/api/products/:id/reviews/:rid', async (req, res) => {
  await db.read();
  const p = db.data.products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  p.reviews = p.reviews.filter(r => r.id !== req.params.rid);
  await saveDB();
  res.json({ success: true });
});

// simple health
app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log('Server running on port', port));
