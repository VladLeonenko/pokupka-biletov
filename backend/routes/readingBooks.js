import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reading-books - Получить все книги пользователя
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM user_reading_books WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[ReadingBooks] Error fetching books:', error);
    console.error('[ReadingBooks] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Если таблица не существует, возвращаем понятную ошибку
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Database table not found. Please run migrations.',
        code: 'TABLE_NOT_FOUND',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch books',
      details: error.message,
      code: error.code
    });
  }
});

// GET /api/reading-books/read - Получить только прочитанные книги
router.get('/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Проверяем существование таблицы
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_reading_books'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('[ReadingBooks] Table user_reading_books does not exist');
      return res.status(500).json({ 
        error: 'Database table not found. Please run migrations.',
        code: 'TABLE_NOT_FOUND'
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM user_reading_books WHERE user_id = $1 AND is_read = TRUE ORDER BY read_date DESC NULLS LAST',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[ReadingBooks] Error fetching read books:', error);
    console.error('[ReadingBooks] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Если таблица не существует, возвращаем понятную ошибку
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return res.status(500).json({ 
        error: 'Database table not found. Please run migrations.',
        code: 'TABLE_NOT_FOUND',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch read books',
      details: error.message,
      code: error.code
    });
  }
});

// POST /api/reading-books - Создать или обновить запись о книге
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_title, book_author, book_genre, is_read, rating, read_date, notes } = req.body;

    if (!book_title) {
      return res.status(400).json({ error: 'book_title is required' });
    }

    const result = await pool.query(
      `INSERT INTO user_reading_books (user_id, book_title, book_author, book_genre, is_read, rating, read_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, book_title, book_author) 
       DO UPDATE SET 
         is_read = COALESCE(EXCLUDED.is_read, user_reading_books.is_read),
         rating = COALESCE(EXCLUDED.rating, user_reading_books.rating),
         read_date = COALESCE(EXCLUDED.read_date, user_reading_books.read_date),
         notes = COALESCE(EXCLUDED.notes, user_reading_books.notes),
         updated_at = NOW()
       RETURNING *`,
      [userId, book_title, book_author || null, book_genre || null, is_read || false, rating || null, read_date || null, notes || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ReadingBooks] Error saving book:', error);
    res.status(500).json({ error: 'Failed to save book' });
  }
});

// PUT /api/reading-books/:id - Обновить запись о книге
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { is_read, rating, read_date, notes, replaced, replaced_with } = req.body;

    // Проверяем, что книга принадлежит пользователю
    const checkResult = await pool.query(
      'SELECT id FROM user_reading_books WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const result = await pool.query(
      `UPDATE user_reading_books
       SET is_read = COALESCE($1, is_read),
           rating = COALESCE($2, rating),
           read_date = COALESCE($3, read_date),
           notes = COALESCE($4, notes),
           replaced = COALESCE($5, replaced),
           replaced_with = COALESCE($6, replaced_with),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [is_read, rating, read_date, notes, replaced, replaced_with, id, userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ReadingBooks] Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// POST /api/reading-books/mark-read - Отметить книгу как прочитанную
router.post('/mark-read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_title, book_author, rating, read_date } = req.body;

    if (!book_title) {
      return res.status(400).json({ error: 'book_title is required' });
    }

    const result = await pool.query(
      `INSERT INTO user_reading_books (user_id, book_title, book_author, is_read, rating, read_date)
       VALUES ($1, $2, $3, TRUE, $4, $5)
       ON CONFLICT (user_id, book_title, book_author) 
       DO UPDATE SET 
         is_read = TRUE,
         rating = COALESCE(EXCLUDED.rating, user_reading_books.rating),
         read_date = COALESCE(EXCLUDED.read_date, CURRENT_DATE),
         updated_at = NOW()
       RETURNING *`,
      [userId, book_title, book_author || null, rating || null, read_date || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[ReadingBooks] Error marking book as read:', error);
    res.status(500).json({ error: 'Failed to mark book as read' });
  }
});

// POST /api/reading-books/replace - Заменить одну или несколько книг
router.post('/replace', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { books, replacement_books } = req.body; // books - массив {book_title, book_author}, replacement_books - массив новых книг

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ error: 'books array is required' });
    }

    if (!Array.isArray(replacement_books) || replacement_books.length === 0) {
      return res.status(400).json({ error: 'replacement_books array is required' });
    }

    const results = [];

    // Помечаем старые книги как замененные
    for (const book of books) {
      const replacementText = replacement_books.map(b => `${b.title}${b.author ? ` (${b.author})` : ''}`).join(', ');
      
      const result = await pool.query(
        `UPDATE user_reading_books
         SET replaced = TRUE,
             replaced_with = $1,
             updated_at = NOW()
         WHERE user_id = $2 AND book_title = $3 AND (book_author = $4 OR (book_author IS NULL AND $4 IS NULL))
         RETURNING *`,
        [replacementText, userId, book.book_title, book.book_author || null]
      );

      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      } else {
        // Если книги нет в БД, создаем запись с пометкой replaced
        const insertResult = await pool.query(
          `INSERT INTO user_reading_books (user_id, book_title, book_author, replaced, replaced_with)
           VALUES ($1, $2, $3, TRUE, $4)
           RETURNING *`,
          [userId, book.book_title, book.book_author || null, replacementText]
        );
        results.push(insertResult.rows[0]);
      }
    }

    // Добавляем новые книги
    for (const newBook of replacement_books) {
      const insertResult = await pool.query(
        `INSERT INTO user_reading_books (user_id, book_title, book_author, book_genre, is_read, rating)
         VALUES ($1, $2, $3, $4, FALSE, NULL)
         ON CONFLICT (user_id, book_title, book_author) DO NOTHING
         RETURNING *`,
        [userId, newBook.title, newBook.author || null, newBook.genre || null]
      );
      
      if (insertResult.rows.length > 0) {
        results.push(insertResult.rows[0]);
      }
    }

    res.json({ replaced: results.filter(r => r.replaced), added: results.filter(r => !r.replaced) });
  } catch (error) {
    console.error('[ReadingBooks] Error replacing books:', error);
    res.status(500).json({ error: 'Failed to replace books' });
  }
});

export default router;


