// Функции для заполнения базы данных начальными данными
import { getDatabase } from './database';
import * as SQLite from 'expo-sqlite';
import {
  User,
  Template,
  Inspection,
  Chat,
  UserRole,
} from '@/types/models';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const defaultUsers: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    role: 'admin',
    fullName: 'Администратор ProCheck',
    profile: {
      avatarUri: undefined,
      specialization: 'Управление системой',
      workHours: '09:00 - 18:00',
      phone: '+7 (999) 000-00-00',
      email: 'admin@procheck.local',
    },
  },
  {
    id: 'user-senior',
    username: 'stins',
    password: '123',
    role: 'seniorInspector',
    fullName: 'Марина Старший Инспектор',
    profile: {
      specialization: 'Промышленная безопасность',
      workHours: '08:00 - 17:00',
      phone: '+7 (999) 111-11-11',
      email: 'stins@procheck.local',
    },
  },
  {
    id: 'user-inspector',
    username: 'ins',
    password: '123',
    role: 'inspector',
    fullName: 'Иван Инспектор',
    profile: {
      specialization: 'Охрана труда',
      workHours: '10:00 - 19:00',
      phone: '+7 (999) 222-22-22',
      email: 'ins@procheck.local',
    },
  },
  {
    id: 'user-customer',
    username: 'zakaz',
    password: '123',
    role: 'customer',
    fullName: 'ООО «ТехПро»',
    profile: {
      specialization: 'Заказчик проверок',
      workHours: '09:00 - 18:00',
      phone: '+7 (999) 333-33-33',
      email: 'zakaz@procheck.local',
    },
  },
];

const defaultTemplates: Template[] = [
  {
    id: 'template-fire',
    title: 'Пожарная безопасность',
    description: 'Контроль состояния систем пожарной безопасности на объекте',
    items: [
      { id: 'titem-fire-1', text: 'Проверка огнетушителей и их сроков годности' },
      { id: 'titem-fire-2', text: 'Наличие схем эвакуации на видимых местах' },
      { id: 'titem-fire-3', text: 'Работоспособность автоматической пожарной сигнализации' },
    ],
    createdBy: 'user-senior',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'template-machinery',
    title: 'Техническое состояние станков',
    description: 'Плановая проверка оборудования механического цеха',
    items: [
      { id: 'titem-mach-1', text: 'Состояние защитных кожухов и ограждений' },
      { id: 'titem-mach-2', text: 'Отсутствие посторонних вибраций и шумов' },
      { id: 'titem-mach-3', text: 'Проверка смазочных материалов и уровней' },
    ],
    createdBy: 'user-senior',
    updatedAt: new Date().toISOString(),
  },
];

export const seedDefaultData = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  // Проверяем, есть ли уже пользователи
  const usersCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM users;');
  if (usersCount && usersCount.count > 0) {
    // Данные уже есть, пропускаем
    return;
  }

  // Добавляем пользователей
  for (const user of defaultUsers) {
    await db.runAsync(
      `INSERT INTO users (id, username, password, role, fullName, specialization, workHours, phone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        user.id,
        user.username,
        user.password,
        user.role,
        user.fullName,
        user.profile.specialization || null,
        user.profile.workHours || null,
        user.profile.phone || null,
        user.profile.email || null,
      ]
    );
  }

  // Добавляем шаблоны
  for (const template of defaultTemplates) {
    await db.runAsync(
      'INSERT INTO templates (id, title, description, createdBy, updatedAt) VALUES (?, ?, ?, ?, ?);',
      [template.id, template.title, template.description || null, template.createdBy, template.updatedAt]
    );

    for (const item of template.items) {
      await db.runAsync(
        'INSERT INTO template_items (id, templateId, text) VALUES (?, ?, ?);',
        [item.id, template.id, item.text]
      );
    }
  }

  // Добавляем начальную проверку
  const inspectionId = 'inspection-1';
  const createdAt = new Date().toISOString();
  const planDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const reportDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  await db.runAsync(
    `INSERT INTO inspections 
     (id, title, type, customerId, templateId, createdAt, enterpriseName, enterpriseAddress, 
      planDate, reportDueDate, status, assignedInspectorId, approvedById, approvedAt, reportId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      inspectionId,
      'Пожарная безопасность в цехе №2',
      'Пожарная безопасность',
      'user-customer',
      'template-fire',
      createdAt,
      'ООО «ТехПро»',
      'г. Москва, ул. Промышленная, д. 4',
      planDate,
      reportDueDate,
      'ожидает утверждения',
      null,
      null,
      null,
      null,
    ]
  );

  // Добавляем пункты проверки
  const checkItems = defaultTemplates[0].items.map((item) => ({
    id: generateId('check'),
    text: item.text,
    status: 'не проверено' as const,
  }));

  for (const item of checkItems) {
    await db.runAsync(
      'INSERT INTO check_items (id, inspectionId, text, status) VALUES (?, ?, ?, ?);',
      [item.id, inspectionId, item.text, item.status]
    );
  }

  // Добавляем чаты с администратором
  const adminUser = defaultUsers.find((u) => u.role === 'admin');
  if (adminUser) {
    for (const user of defaultUsers) {
      if (user.id !== adminUser.id) {
        const chatId = `chat-admin-${user.id}`;
        await db.runAsync('INSERT INTO chats (id, title) VALUES (?, ?);', [
          chatId,
          `Чат с администратором (${user.fullName})`,
        ]);

        await db.runAsync('INSERT INTO chat_participants (chatId, userId) VALUES (?, ?);', [chatId, adminUser.id]);
        await db.runAsync('INSERT INTO chat_participants (chatId, userId) VALUES (?, ?);', [chatId, user.id]);

        const messageId = generateId('msg');
        await db.runAsync(
          'INSERT INTO messages (id, chatId, authorId, text, createdAt) VALUES (?, ?, ?, ?, ?);',
          [
            messageId,
            chatId,
            adminUser.id,
            'Здравствуйте! Это служебный чат с администратором. Готов помочь.',
            new Date().toISOString(),
          ]
        );
      }
    }
  }
};

