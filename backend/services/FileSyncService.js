import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FileSyncService - автоматическая синхронизация файлов из backend/uploads в frontend/dist/uploads
 * 
 * При загрузке изображения через /api/images:
 * 1. Файл сохраняется в backend/uploads/images/ (multer)
 * 2. FileSyncService автоматически копирует в frontend/dist/uploads/images/
 * 3. Nginx отдает файлы из frontend/dist (root frontend/dist)
 */
class FileSyncService {
  constructor() {
    // Определяем пути из env или используем относительные
    this.backendUploads = process.env.BACKEND_UPLOADS || 
      path.resolve(__dirname, '..', 'uploads', 'images');
    
    this.frontendUploads = process.env.FRONTEND_UPLOADS || 
      path.resolve(__dirname, '..', '..', 'frontend', 'dist', 'uploads', 'images');
    
    // Пользователь и группа для chown (для production на сервере)
    this.fileOwner = process.env.FILE_OWNER || 'www-data';
    this.fileGroup = process.env.FILE_GROUP || 'www-data';
    
    // Режим работы (dev/production)
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Синхронизирует файл из backend/uploads в frontend/dist/uploads
   * @param {string} filename - имя файла (например: "image-1234567890.png")
   * @returns {Promise<void>}
   */
  async syncFile(filename) {
    if (!filename) {
      console.warn('[FileSync] ⚠️  Filename is empty, skipping sync');
      return;
    }

    const sourcePath = path.join(this.backendUploads, filename);
    const destPath = path.join(this.frontendUploads, filename);

    try {
      // Проверяем что исходный файл существует
      try {
        await fs.access(sourcePath);
      } catch (err) {
        console.error(`[FileSync] ❌ Source file not found: ${sourcePath}`);
        return;
      }

      // Создаем директорию назначения если её нет
      try {
        await fs.mkdir(this.frontendUploads, { recursive: true });
      } catch (err) {
        console.error(`[FileSync] ❌ Failed to create destination directory: ${err.message}`);
        return;
      }

      // Копируем файл
      await fs.copyFile(sourcePath, destPath);

      // Устанавливаем права доступа
      // В production на сервере устанавливаем права для nginx (www-data:www-data)
      if (this.isProduction) {
        try {
          // Используем chmod для прав доступа (644 = rw-r--r--)
          await fs.chmod(destPath, 0o644);
          
          // Пытаемся установить владельца через chown (только если есть права)
          // В dev режиме может не работать, игнорируем ошибки
          try {
            await execAsync(`chown ${this.fileOwner}:${this.fileGroup} "${destPath}"`);
          } catch (chownError) {
            // В dev режиме или без прав - это нормально
            if (!this.isProduction) {
              // В dev режиме просто логируем
            } else {
              console.warn(`[FileSync] ⚠️  Could not set owner (may need sudo): ${chownError.message}`);
            }
          }
        } catch (chmodError) {
          console.warn(`[FileSync] ⚠️  Could not set permissions: ${chmodError.message}`);
        }
      } else {
        // В dev режиме просто устанавливаем права 644
        await fs.chmod(destPath, 0o644);
      }

      console.log(`[FileSync] ✅ Synced: ${filename}`);
    } catch (error) {
      // Не ломаем upload если синхронизация не удалась
      console.error(`[FileSync] ❌ Error syncing file ${filename}:`, error.message);
      // Не пробрасываем ошибку дальше - upload уже успешен
    }
  }

  /**
   * Синхронизирует все файлы из backend/uploads в frontend/dist/uploads
   * Полезно для первоначальной синхронизации или восстановления
   * @returns {Promise<{synced: number, errors: number}>}
   */
  async syncAll() {
    let synced = 0;
    let errors = 0;

    try {
      const files = await fs.readdir(this.backendUploads);
      
      for (const file of files) {
        try {
          const filePath = path.join(this.backendUploads, file);
          const stats = await fs.stat(filePath);
          
          // Синхронизируем только файлы (не директории)
          if (stats.isFile()) {
            await this.syncFile(file);
            synced++;
          }
        } catch (error) {
          console.error(`[FileSync] ❌ Error syncing ${file}:`, error.message);
          errors++;
        }
      }

      console.log(`[FileSync] ✅ Sync complete: ${synced} files synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error(`[FileSync] ❌ Error reading source directory:`, error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Удаляет файл из frontend/dist/uploads
   * Вызывается при удалении изображения
   * @param {string} filename - имя файла
   * @returns {Promise<void>}
   */
  async deleteFile(filename) {
    if (!filename) return;

    const destPath = path.join(this.frontendUploads, filename);

    try {
      await fs.unlink(destPath);
      console.log(`[FileSync] ✅ Deleted: ${filename}`);
    } catch (error) {
      // Если файл не существует - это нормально
      if (error.code !== 'ENOENT') {
        console.error(`[FileSync] ❌ Error deleting file ${filename}:`, error.message);
      }
    }
  }
}

// Экспортируем singleton instance
export default new FileSyncService();
