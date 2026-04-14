const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// JSON body parser
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Gallery data file
const GALLERY_FILE = path.join(__dirname, 'gallery.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'gallery');

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Load gallery data
function loadGallery() {
    if (!fs.existsSync(GALLERY_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

// Save gallery data
function saveGallery(data) {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(data, null, 2));
}

// Multer config
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E6) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Apenas imagens são permitidas'));
    }
});

// GET /api/gallery - list all photos
app.get('/api/gallery', (req, res) => {
    const photos = loadGallery();
    res.json(photos);
});

// POST /api/gallery/upload - upload one or more images
app.post('/api/gallery/upload', upload.array('photos', 20), (req, res) => {
    if (!req.files || !req.files.length) {
        return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }
    const gallery = loadGallery();
    const newPhotos = req.files.map(file => ({
        id: Date.now() + '-' + Math.round(Math.random() * 1E6),
        filename: file.filename,
        src: '/uploads/gallery/' + file.filename,
        date: Date.now()
    }));
    gallery.push(...newPhotos);
    saveGallery(gallery);
    res.json({ success: true, photos: newPhotos });
});

// DELETE /api/gallery/:id - remove a photo
app.delete('/api/gallery/:id', (req, res) => {
    let gallery = loadGallery();
    const photo = gallery.find(p => p.id === req.params.id);
    if (!photo) return res.status(404).json({ error: 'Foto não encontrada' });

    // Remove file from disk
    const filePath = path.join(UPLOAD_DIR, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    gallery = gallery.filter(p => p.id !== req.params.id);
    saveGallery(gallery);
    res.json({ success: true });
});

// PUT /api/gallery/reorder - reorder photos
app.put('/api/gallery/reorder', (req, res) => {
    const { order } = req.body; // array of ids in new order
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array de ids' });

    const gallery = loadGallery();
    const reordered = [];
    for (const id of order) {
        const photo = gallery.find(p => p.id === id);
        if (photo) reordered.push(photo);
    }
    saveGallery(reordered);
    res.json({ success: true });
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`Ela's Personalizados rodando na porta ${PORT}`);
});
