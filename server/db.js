const { createClient } = require('@libsql/client');

/**
 * 初始化 Turso 数据库连接
 * 需要环境变量: TURSO_URL, TURSO_TOKEN
 */
async function initDatabase() {
  const db = createClient({
    url: process.env.TURSO_URL || 'file:music.db',
    authToken: process.env.TURSO_TOKEN,
  });

  // 创建基础表
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '未知艺术家',
      album TEXT DEFAULT '',
      duration INTEGER DEFAULT 0,
      cover_url TEXT DEFAULT '',
      file_url TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      file_type TEXT DEFAULT '',
      uploader_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      song_id INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  // 迁移：为已有的 songs 表补加列（兼容旧库）
  await migrateColumn(db, 'songs', 'file_size', 'INTEGER DEFAULT 0');
  await migrateColumn(db, 'songs', 'file_type', "TEXT DEFAULT ''");
  await migrateColumn(db, 'songs', 'uploader_id', 'INTEGER');

  // 如果歌曲表为空，插入种子数据
  const result = await db.execute('SELECT COUNT(*) AS count FROM songs');
  const count = result.rows[0]?.count ?? 0;
  if (count === 0) {
    const seedSongs = [
      ['晴天', '周杰伦', '叶惠美', 269],
      ['夜曲', '周杰伦', '十一月的萧邦', 226],
      ['平凡之路', '朴树', '猎户星座', 312],
      ['起风了', '买辣椒也用券', '起风了', 325],
      ['Lemon', '米津玄师', 'STRAY SHEEP', 253],
      ['Bohemian Rhapsody', 'Queen', 'A Night at the Opera', 355],
    ];

    for (const song of seedSongs) {
      await db.execute({
        sql: 'INSERT INTO songs (title, artist, album, duration) VALUES (?, ?, ?, ?)',
        args: song,
      });
    }
    console.log('✅ 已插入示例歌曲数据');
  }

  return db;
}

/**
 * 安全地给表添加列（如果不存在）
 */
async function migrateColumn(db, table, column, definition) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const columns = info.rows.map(row => row.name);
  if (!columns.includes(column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`📌 已迁移: ${table}.${column}`);
  }
}

module.exports = { initDatabase };
