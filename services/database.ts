// Сервис для работы с SQLite базой данных
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { seedDefaultData } from './seedData';

const DB_NAME = 'ProCheck_db.db';

// Получение экземпляра базы данных
let dbInstance: SQLite.SQLiteDatabase | null = null;

// Инициализация базы данных - копирование существующей БД из assets при первом запуске
const initializeDatabase = async (): Promise<void> => {
  try {
    // Получаем путь к директории документов
    const documentDir = FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error('documentDirectory недоступен');
    }
    
    const dbPath = `${documentDir}SQLite/${DB_NAME}`;
    
    // Проверяем, существует ли уже скопированная БД
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    
    if (!dbInfo.exists) {
      // Создаём директорию SQLite если её нет
      const sqliteDir = `${documentDir}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
      }

      try {
        // Загружаем БД из assets
        // Используем require для получения пути к файлу БД в assets
        const asset = Asset.fromModule(require('../assets/ProCheck_db.db'));
        await asset.downloadAsync();
        
        if (asset.localUri) {
          // Копируем файл БД из assets в директорию документов
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: dbPath,
          });
          console.log('База данных успешно скопирована из assets');
        } else {
          throw new Error('Не удалось получить путь к файлу БД из assets');
        }
      } catch (error) {
        console.warn('Не удалось скопировать существующую БД из assets:', error);
        console.log('Будет создана новая база данных');
      }
    } else {
      console.log('База данных уже существует');
    }
  } catch (error) {
    console.error('Ошибка при инициализации БД:', error);
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) {
    // Инициализируем БД (копируем из assets если нужно)
    await initializeDatabase();
    
    // Открываем БД (Expo SQLite найдёт её в documentDirectory/SQLite)
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Проверяем и создаём недостающие таблицы
    await ensureTablesExist(dbInstance);
    
    // Проверяем, есть ли данные в БД
    try {
      const usersCount = await dbInstance.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM users;'
      );
      
      // Если БД пустая (что маловероятно если скопировали существующую), заполняем дефолтными данными
      if (!usersCount || usersCount.count === 0) {
        console.log('База данных пуста, заполняем дефолтными данными');
        await seedDefaultData(dbInstance);
      } else {
        console.log(`База данных загружена, пользователей: ${usersCount.count}`);
      }
    } catch (e) {
      // Если таблицы еще не созданы, заполняем дефолтными данными
      console.log('Таблицы не найдены, создаём и заполняем дефолтными данными');
      await seedDefaultData(dbInstance);
    }
  }
  return dbInstance;
};

// Проверка и создание недостающих таблиц
const ensureTablesExist = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  // Проверяем наличие таблицы reports
  try {
    await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='reports';");
  } catch {
    await db.execAsync(`
      CREATE TABLE reports (
        id TEXT PRIMARY KEY,
        inspectionId TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        customerId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        documentPath TEXT NOT NULL,
        editableUntil TEXT NOT NULL,
        locked INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (inspectionId) REFERENCES inspections(id),
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (customerId) REFERENCES users(id)
      );
    `);
  }

  // Проверяем наличие поля purpose в account_requests
  try {
    await db.getFirstAsync("SELECT purpose FROM account_requests LIMIT 1;");
  } catch {
    try {
      await db.execAsync("ALTER TABLE account_requests ADD COLUMN purpose TEXT;");
    } catch (e) {
      // Поле уже существует или таблица не существует - игнорируем
    }
  }

  // Проверяем наличие таблицы inspection_photos
  try {
    await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='inspection_photos';");
  } catch {
    await db.execAsync(`
      CREATE TABLE inspection_photos (
        id TEXT PRIMARY KEY,
        inspectionId TEXT NOT NULL,
        photoUri TEXT NOT NULL,
        FOREIGN KEY (inspectionId) REFERENCES inspections(id)
      );
    `);
  }

  // Проверяем наличие таблицы chat_deleted_for
  try {
    await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='chat_deleted_for';");
  } catch {
    await db.execAsync(`
      CREATE TABLE chat_deleted_for (
        chatId TEXT NOT NULL,
        userId TEXT NOT NULL,
        PRIMARY KEY (chatId, userId),
        FOREIGN KEY (chatId) REFERENCES chats(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);
  }
};
