const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDatabase } = require('./db');
const { authMiddleware, JWT_SECRET } = require('./middleware/auth');
const { registerUploadRoutes } = require('./routes/upload');
const { registerPlaylistRoutes } = require('./routes/playlists');

const PORT = process.env.PORT || 3001;

// ==================== 数据库查询助手（Turso） ====================

/** 查询多条记录 */
async function queryAll(db, sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

/** 查询单条记录 */
async function queryOne(db, sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] ?? null;
}

/** 执行写操作（INSERT/UPDATE/DELETE） */
async function execute(db, sql, params = []) {
  await db.execute({ sql, args: params });
}

/** 执行 INSERT 并返回新行 ID */
async function insertAndGetId(db, sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return Number(result.lastInsertRowid);
}

// ==================== 启动服务器 ====================

async function start() {
  const db = await initDatabase();

  const app = express();

  // CORS（允许所有来源，生产环境 Render + Vercel 跨域）
  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // ==================== API 路由 ====================

  // 获取所有歌曲
  app.get('/api/songs', async (_req, res) => {
    try {
      const songs = await queryAll(db, 'SELECT * FROM songs ORDER BY created_at DESC');
      res.json(songs);
    } catch (err) {
      console.error('获取歌曲失败:', err);
      res.status(500).json({ error: '获取歌曲失败' });
    }
  });

  // 获取单首歌曲
  app.get('/api/songs/:id', async (req, res) => {
    try {
      const song = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [req.params.id]);
      if (!song) return res.status(404).json({ error: '歌曲不存在' });
      res.json(song);
    } catch (err) {
      console.error('获取歌曲失败:', err);
      res.status(500).json({ error: '获取歌曲失败' });
    }
  });

  // 添加歌曲（需登录）
  app.post('/api/songs', authMiddleware, async (req, res) => {
    try {
      const { title, artist, album, duration, cover_url, file_url } = req.body;
      if (!title) return res.status(400).json({ error: '歌曲标题不能为空' });

      const newId = await insertAndGetId(
        db,
        'INSERT INTO songs (title, artist, album, duration, cover_url, file_url, uploader_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, artist || '未知艺术家', album || '', duration || 0, cover_url || '', file_url || '', req.user.id]
      );

      const newSong = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [newId]);
      res.status(201).json(newSong);
    } catch (err) {
      console.error('添加歌曲失败:', err);
      res.status(500).json({ error: '添加歌曲失败' });
    }
  });

  // 删除歌曲（需登录，仅限自己上传的）
  app.delete('/api/songs/:id', authMiddleware, async (req, res) => {
    try {
      const existing = await queryOne(db, 'SELECT id, uploader_id FROM songs WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: '歌曲不存在' });
      if (existing.uploader_id && existing.uploader_id !== req.user.id) {
        return res.status(403).json({ error: '只能删除自己上传的歌曲' });
      }
      await execute(db, 'DELETE FROM songs WHERE id = ?', [req.params.id]);
      res.json({ message: '删除成功' });
    } catch (err) {
      console.error('删除歌曲失败:', err);
      res.status(500).json({ error: '删除歌曲失败' });
    }
  });

  // 编辑歌曲（需登录）
  app.put('/api/songs/:id', authMiddleware, async (req, res) => {
    try {
      const existing = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).json({ error: '歌曲不存在' });

      const { title, artist, album } = req.body;
      await execute(
        db,
        'UPDATE songs SET title = ?, artist = ?, album = ? WHERE id = ?',
        [title ?? existing.title, artist ?? existing.artist, album ?? existing.album, req.params.id]
      );

      const updated = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (err) {
      console.error('编辑歌曲失败:', err);
      res.status(500).json({ error: '编辑歌曲失败' });
    }
  });

  // ==================== 歌单路由 ====================
  registerPlaylistRoutes(app, db, queryOne, queryAll, execute, insertAndGetId, authMiddleware);

  // ==================== 上传路由 ====================
  registerUploadRoutes(app, db, queryOne, execute, insertAndGetId, authMiddleware);

  // ==================== 认证路由 ====================

  // 用户注册
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) return res.status(400).json({ error: '请填写所有字段' });
      if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });

      const existing = await queryOne(db, 'SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
      if (existing) return res.status(409).json({ error: '用户名或邮箱已被注册' });

      const hashedPassword = bcrypt.hashSync(password, 10);
      await execute(db, 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

      res.status(201).json({ message: '注册成功' });
    } catch (err) {
      console.error('注册失败:', err);
      res.status(500).json({ error: '注册失败' });
    }
  });

  // 用户登录
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });

      const user = await queryOne(db, 'SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
      if (!user) return res.status(401).json({ error: '用户名或密码错误' });

      const isMatch = bcrypt.compareSync(password, user.password);
      if (!isMatch) return res.status(401).json({ error: '用户名或密码错误' });

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: '登录成功',
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (err) {
      console.error('登录失败:', err);
      res.status(500).json({ error: '登录失败' });
    }
  });

  // 获取当前用户信息（需登录）
  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await queryOne(db, 'SELECT id, username, email, created_at FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ error: '用户不存在' });
      res.json(user);
    } catch (err) {
      console.error('获取用户信息失败:', err);
      res.status(500).json({ error: '获取用户信息失败' });
    }
  });

  // 健康检查
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 启动
  app.listen(PORT, () => {
    console.log(`🚀 音乐网站后端已启动: http://localhost:${PORT}`);
    console.log(`📡 API 地址: http://localhost:${PORT}/api`);
  });
}

start().catch((err) => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});
