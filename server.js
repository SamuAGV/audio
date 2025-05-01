const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3003;

// Configuración
app.use(express.static('public'));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // Límite de 50MB
    abortOnLimit: true
}));
app.use(cors());
app.use(express.json());

// Carpeta donde se guardarán los audios
const AUDIO_DIR = path.join(__dirname, 'public', 'audios');

// Crear la carpeta si no existe
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Ruta para subir audios
app.post('/upload-audio', (req, res) => {
    if (!req.files || !req.files.audio) {
        return res.status(400).json({ 
            success: false, 
            message: 'No se subió ningún archivo de audio' 
        });
    }

    const audioFile = req.files.audio;
    const fileName = audioFile.name;
    const filePath = path.join(AUDIO_DIR, fileName);

    // Validar que no exista un archivo con el mismo nombre
    if (fs.existsSync(filePath)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Ya existe un archivo con ese nombre' 
        });
    }

    // Validar extensión del archivo
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    const fileExtension = path.extname(fileName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Formato de audio no permitido' 
        });
    }

    audioFile.mv(filePath, (err) => {
        if (err) {
            console.error('Error al guardar el audio:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al guardar el audio' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Audio guardado correctamente',
            fileName: fileName
        });
    });
});

// Ruta para obtener lista de audios
app.get('/get-audios', (req, res) => {
    fs.readdir(AUDIO_DIR, (err, files) => {
        if (err) {
            console.error('Error al leer la carpeta de audios:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener audios' 
            });
        }

        // Ordenar por fecha de modificación (más recientes primero)
        const sortedFiles = files.map(file => {
            const stat = fs.statSync(path.join(AUDIO_DIR, file));
            return {
                name: file,
                mtime: stat.mtime
            };
        }).sort((a, b) => b.mtime - a.mtime)
          .map(file => file.name);

        res.json(sortedFiles);
    });
});

// Ruta para eliminar un audio
app.delete('/delete-audio/:filename', (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(AUDIO_DIR, filename);

    // Validar que el nombre del archivo sea seguro
    if (!filename || filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ 
            success: false, 
            message: 'Nombre de archivo inválido' 
        });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error al eliminar el audio:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al eliminar el audio' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Audio eliminado correctamente' 
        });
    });
});

// Servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Los audios se guardan en: ${AUDIO_DIR}`);
});