/**
 * 歌单 CRUD 路由
 */
function registerPlaylistRoutes(app, db, queryOne, queryAll, execute, insertAndGetId, authMiddleware) {

  // ==================== 歌单 CRUD ====================

  // 获取所有歌单（含歌曲数量）
  app.get('/api/playlists', async (_req, res) => {
    try {
      const playlists = await queryAll(db, `
        SELECT p.*, COALESCE(ps.cnt, 0) AS song_count
        FROM playlists p
        LEFT JOIN (
          SELECT playlist_id, COUNT(*) AS cnt FROM playlist_songs GROUP BY playlist_id
        ) ps ON ps.playlist_id = p.id
        ORDER BY p.created_at DESC
      `);
      res.json(playlists);
    } catch (err) {
      console.error('获取歌单失败:', err);
      res.status(500).json({ error: '获取歌单失败' });
    }
  });

  // 获取单个歌单详情（含所有歌曲）
  app.get('/api/playlists/:id', async (req, res) => {
    try {
      const playlist = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [req.params.id]);
      if (!playlist) {
        return res.status(404).json({ error: '歌单不存在' });
      }

      const songs = await queryAll(db, `
        SELECT s.* FROM songs s
        INNER JOIN playlist_songs ps ON ps.song_id = s.id
        WHERE ps.playlist_id = ?
        ORDER BY ps.sort_order ASC, ps.id ASC
      `, [req.params.id]);

      res.json({ ...playlist, songs });
    } catch (err) {
      console.error('获取歌单详情失败:', err);
      res.status(500).json({ error: '获取歌单详情失败' });
    }
  });

  // 创建歌单（需登录）
  app.post('/api/playlists', authMiddleware, async (req, res) => {
    try {
      const { name, description, cover_url } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: '歌单名称不能为空' });
      }

      const newId = await insertAndGetId(
        db,
        'INSERT INTO playlists (name, description, cover_url) VALUES (?, ?, ?)',
        [name.trim(), description || '', cover_url || '']
      );

      const playlist = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [newId]);
      res.status(201).json(playlist);
    } catch (err) {
      console.error('创建歌单失败:', err);
      res.status(500).json({ error: '创建歌单失败' });
    }
  });

  // 修改歌单（需登录）
  app.put('/api/playlists/:id', authMiddleware, async (req, res) => {
    try {
      const existing = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: '歌单不存在' });
      }

      const { name, description, cover_url } = req.body;
      await execute(
        db,
        'UPDATE playlists SET name = ?, description = ?, cover_url = ? WHERE id = ?',
        [name ?? existing.name, description ?? existing.description, cover_url ?? existing.cover_url, req.params.id]
      );

      const updated = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (err) {
      console.error('修改歌单失败:', err);
      res.status(500).json({ error: '修改歌单失败' });
    }
  });

  // 删除歌单（需登录）
  app.delete('/api/playlists/:id', authMiddleware, async (req, res) => {
    try {
      const existing = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [req.params.id]);
      if (!existing) {
        return res.status(404).json({ error: '歌单不存在' });
      }

      await execute(db, 'DELETE FROM playlist_songs WHERE playlist_id = ?', [req.params.id]);
      await execute(db, 'DELETE FROM playlists WHERE id = ?', [req.params.id]);

      res.json({ message: '删除成功' });
    } catch (err) {
      console.error('删除歌单失败:', err);
      res.status(500).json({ error: '删除歌单失败' });
    }
  });

  // ==================== 歌单内歌曲管理 ====================

  // 添加歌曲到歌单
  app.post('/api/playlists/:id/songs', authMiddleware, async (req, res) => {
    try {
      const playlist = await queryOne(db, 'SELECT * FROM playlists WHERE id = ?', [req.params.id]);
      if (!playlist) {
        return res.status(404).json({ error: '歌单不存在' });
      }

      const { song_id } = req.body;
      if (!song_id) {
        return res.status(400).json({ error: '缺少 song_id' });
      }

      const song = await queryOne(db, 'SELECT * FROM songs WHERE id = ?', [song_id]);
      if (!song) {
        return res.status(404).json({ error: '歌曲不存在' });
      }

      const existingLink = await queryOne(
        db,
        'SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        [req.params.id, song_id]
      );
      if (existingLink) {
        return res.status(409).json({ error: '歌曲已在歌单中' });
      }

      await execute(db, 'INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)', [req.params.id, song_id]);

      res.status(201).json({ message: '已添加到歌单' });
    } catch (err) {
      console.error('添加歌曲到歌单失败:', err);
      res.status(500).json({ error: '操作失败' });
    }
  });

  // 从歌单移除歌曲
  app.delete('/api/playlists/:id/songs/:songId', authMiddleware, async (req, res) => {
    try {
      const result = await queryOne(
        db,
        'SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        [req.params.id, req.params.songId]
      );
      if (!result) {
        return res.status(404).json({ error: '该歌曲不在歌单中' });
      }

      await execute(db, 'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', [req.params.id, req.params.songId]);

      res.json({ message: '已从歌单移除' });
    } catch (err) {
      console.error('移除歌曲失败:', err);
      res.status(500).json({ error: '操作失败' });
    }
  });
}

module.exports = { registerPlaylistRoutes };
