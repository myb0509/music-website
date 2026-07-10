const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// 确保 uploads 目录存在
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// multer 配置：只接受音频文件，最大 30MB
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, uniqueSuffix + ext);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'audio/flac', 'audio/aac', 'audio/x-m4a', 'audio/mp4', 'video/mp4'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件格式: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 },
});

/**
 * 用 music-metadata 提取音频元数据
 */
async function extractMetadata(filePath) {
  try {
    const { parseFile } = await import('music-metadata');
    const meta = await parseFile(filePath);

    const title = meta.common.title ?? path.basename(filePath, path.extname(filePath));
    const artist = meta.common.artist ?? '未知艺术家';
    const album = meta.common.album ?? '';
    const duration = Math.round(meta.format.duration ?? 0);

    return { title, artist, album, duration };
  } catch (err) {
    console.warn('元数据提取失败，使用文件名:', err.message);
    const basename = path.basename(filePath, path.extname(filePath));
    return { title: basename, artist: '未知艺术家', album: '', duration: 0 };
  }
}

/**
 * 注册上传路由
 */
function registerUploadRoutes(app, db, queryOne, execute, insertAndGetId, authMiddleware) {
  // 托管上传文件
  app.use('/uploads', express.static(UPLOADS_DIR));

  // 上传单首歌曲
  app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请选择音频文件' });
      }

      const file = req.file;
      const metadata = await extractMetadata(file.path);

      const title = req.body.title || metadata.title;
      const artist = req.body.artist || metadata.artist;
      const album = req.body.album || metadata.album;

      const file_url = '/uploads/' + file.filename;
      const newId = await insertAndGetId(
        db,
        `INSERT INTO songs (title, artist, album, duration, file_url, file_size, file_type, uploader_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, artist, album, metadata.duration, file_url, file.size, file.mimetype, req.user.id]
      );

      const song = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [newId]);

      res.status(201).json({
        message: '上传成功',
        song,
        metadata: { title: metadata.title, artist: metadata.artist, album: metadata.album, duration: metadata.duration },
      });
    } catch (err) {
      console.error('上传失败:', err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (err.message && err.message.includes('不支持的文件格式')) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: '上传失败: ' + err.message });
    }
  });

  // 获取当前用户上传的歌曲
  app.get('/api/my-songs', authMiddleware, async (req, res) => {
    try {
      const result = await db.execute({
        sql: 'SELECT * FROM songs WHERE uploader_id = ? ORDER BY created_at DESC',
        args: [req.user.id],
      });
      res.json(result.rows);
    } catch (err) {
      console.error('获取我的歌曲失败:', err);
      res.status(500).json({ error: '获取我的歌曲失败' });
    }
  });
}

module.exports = { registerUploadRoutes, UPLOADS_DIR };
