// Сервис для работы с данными через SQLite
import {
  AccountRequest,
  Chat,
  ChatMessage,
  CheckItemStatus,
  CheckItemTemplate,
  Inspection,
  InspectionStatus,
  Report,
  Template,
  User,
  UserRole
} from '@/types/models';
import { getDatabase } from './database';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

// ============= USERS =============

export const getAllUsers = async (): Promise<User[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM users ORDER BY username;'
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    fullName: row.fullName,
    profile: {
      avatarUri: row.avatarUri || undefined,
      specialization: row.specialization || undefined,
      workHours: row.workHours || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
    },
  }));
};

export const getUserById = async (id: string): Promise<User | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM users WHERE id = '${id}';`
  );

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    fullName: row.fullName,
    profile: {
      avatarUri: row.avatarUri || undefined,
      specialization: row.specialization || undefined,
      workHours: row.workHours || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
    },
  };
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const db = await getDatabase();
  // Экранируем одинарные кавычки для безопасности
  const escapedUsername = username.replace(/'/g, "''");
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM users WHERE LOWER(username) = LOWER('${escapedUsername}');`
  );

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    fullName: row.fullName,
    profile: {
      avatarUri: row.avatarUri || undefined,
      specialization: row.specialization || undefined,
      workHours: row.workHours || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
    },
  };
};

export const createUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const db = await getDatabase();
  const id = generateId('user');
  
  await db.runAsync(
    `INSERT INTO users (id, username, password, role, fullName, specialization, workHours, phone, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
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

  return { ...user, id };
};

export const updateUser = async (id: string, user: Partial<User>): Promise<void> => {
  const db = await getDatabase();
  
  if (user.profile) {
    await db.runAsync(
      `UPDATE users SET fullName = ?, specialization = ?, workHours = ?, phone = ?, email = ?
       WHERE id = ?;`,
      [
        user.fullName || (await getUserById(id))?.fullName || '',
        user.profile.specialization || null,
        user.profile.workHours || null,
        user.profile.phone || null,
        user.profile.email || null,
        id,
      ]
    );
  } else if (user.fullName) {
    await db.runAsync('UPDATE users SET fullName = ? WHERE id = ?;', [user.fullName, id]);
  }
};

export const updateUserPassword = async (id: string, newPassword: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('UPDATE users SET password = ? WHERE id = ?;', [newPassword, id]);
};

export const deleteUser = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM users WHERE id = ?;', [id]);
};

// ============= TEMPLATES =============

export const getAllTemplates = async (): Promise<Template[]> => {
  const db = await getDatabase();
  const templates = await db.getAllAsync<any>('SELECT * FROM templates ORDER BY updatedAt DESC;');
  
  const result: Template[] = [];
  for (const template of templates) {
    // Используем прямую подстановку для ID, так как они генерируются системой и безопасны
    const items = await db.getAllAsync<CheckItemTemplate>(
      `SELECT id, text FROM template_items WHERE templateId = '${template.id}' ORDER BY id;`
    );
    
    result.push({
      id: template.id,
      title: template.title,
      description: template.description || undefined,
      items,
      createdBy: template.createdBy,
      updatedAt: template.updatedAt,
    });
  }
  
  return result;
};

export const getTemplateById = async (id: string): Promise<Template | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const template = await db.getFirstAsync<any>(
    `SELECT * FROM templates WHERE id = '${id}';`
  );

  if (!template) return null;

  const items = await db.getAllAsync<CheckItemTemplate>(
    `SELECT id, text FROM template_items WHERE templateId = '${id}' ORDER BY id;`
  );

  return {
    id: template.id,
    title: template.title,
    description: template.description || undefined,
    items,
    createdBy: template.createdBy,
    updatedAt: template.updatedAt,
  };
};

export const createTemplate = async (template: Omit<Template, 'id' | 'updatedAt'>): Promise<Template> => {
  const db = await getDatabase();
  const id = generateId('template');
  const updatedAt = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO templates (id, title, description, createdBy, updatedAt) VALUES (?, ?, ?, ?, ?);',
    [id, template.title, template.description || null, template.createdBy, updatedAt]
  );

  for (const item of template.items) {
    await db.runAsync(
      'INSERT INTO template_items (id, templateId, text) VALUES (?, ?, ?);',
      [item.id, id, item.text]
    );
  }

  return { ...template, id, updatedAt };
};

export const updateTemplate = async (id: string, template: Partial<Template>): Promise<void> => {
  const db = await getDatabase();
  const updatedAt = new Date().toISOString();

  if (template.title || template.description !== undefined || template.createdBy) {
    const existing = await getTemplateById(id);
    if (!existing) throw new Error('Template not found');

    await db.runAsync(
      'UPDATE templates SET title = ?, description = ?, updatedAt = ? WHERE id = ?;',
      [
        template.title ?? existing.title,
        template.description !== undefined ? template.description : existing.description || null,
        updatedAt,
        id,
      ]
    );
  }

  if (template.items) {
    await db.runAsync('DELETE FROM template_items WHERE templateId = ?;', [id]);
    for (const item of template.items) {
      await db.runAsync(
        'INSERT INTO template_items (id, templateId, text) VALUES (?, ?, ?);',
        [item.id, id, item.text]
      );
    }
  }
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM template_items WHERE templateId = ?;', [id]);
  await db.runAsync('DELETE FROM templates WHERE id = ?;', [id]);
};

// ============= INSPECTIONS =============

export const getAllInspections = async (): Promise<Inspection[]> => {
  const db = await getDatabase();
  const inspections = await db.getAllAsync<any>(
    'SELECT * FROM inspections ORDER BY createdAt DESC;'
  );

  const result: Inspection[] = [];
  for (const inspection of inspections) {
    // Используем прямую подстановку для ID, так как они генерируются системой и безопасны
    const checkItems = await db.getAllAsync<any>(
      `SELECT id, text, status FROM check_items WHERE inspectionId = '${inspection.id}' ORDER BY id;`
    );

    const photos = await db.getAllAsync<{ photoUri: string }>(
      `SELECT photoUri FROM inspection_photos WHERE inspectionId = '${inspection.id}';`
    );

    result.push({
      id: inspection.id,
      title: inspection.title,
      type: inspection.type,
      customerId: inspection.customerId,
      templateId: inspection.templateId || undefined,
      createdAt: inspection.createdAt,
      enterprise: {
        name: inspection.enterpriseName,
        address: inspection.enterpriseAddress,
      },
      planDate: inspection.planDate,
      reportDueDate: inspection.reportDueDate,
      status: inspection.status as InspectionStatus,
      checkItems: checkItems.map((item) => ({
        id: item.id,
        text: item.text,
        status: item.status as CheckItemStatus,
      })),
      assignedInspectorId: inspection.assignedInspectorId || undefined,
      approvedById: inspection.approvedById || undefined,
      approvedAt: inspection.approvedAt || undefined,
      reportId: inspection.reportId || undefined,
      photos: photos.map((p) => p.photoUri),
    });
  }

  return result;
};

export const getInspectionById = async (id: string): Promise<Inspection | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const inspection = await db.getFirstAsync<any>(
    `SELECT * FROM inspections WHERE id = '${id}';`
  );

  if (!inspection) return null;

  const checkItems = await db.getAllAsync<any>(
    `SELECT id, text, status FROM check_items WHERE inspectionId = '${id}' ORDER BY id;`
  );

  const photos = await db.getAllAsync<{ photoUri: string }>(
    `SELECT photoUri FROM inspection_photos WHERE inspectionId = '${id}';`
  );

  return {
    id: inspection.id,
    title: inspection.title,
    type: inspection.type,
    customerId: inspection.customerId,
    templateId: inspection.templateId || undefined,
    createdAt: inspection.createdAt,
    enterprise: {
      name: inspection.enterpriseName,
      address: inspection.enterpriseAddress,
    },
    planDate: inspection.planDate,
    reportDueDate: inspection.reportDueDate,
    status: inspection.status as InspectionStatus,
    checkItems: checkItems.map((item) => ({
      id: item.id,
      text: item.text,
      status: item.status as CheckItemStatus,
    })),
    assignedInspectorId: inspection.assignedInspectorId || undefined,
    approvedById: inspection.approvedById || undefined,
    approvedAt: inspection.approvedAt || undefined,
    reportId: inspection.reportId || undefined,
    photos: photos.map((p) => p.photoUri),
  };
};

export const createInspection = async (
  inspection: Omit<Inspection, 'id' | 'status' | 'createdAt'>
): Promise<Inspection> => {
  const db = await getDatabase();
  const id = generateId('inspection');
  const createdAt = new Date().toISOString();
  const status: InspectionStatus = 'ожидает утверждения';

  await db.runAsync(
    `INSERT INTO inspections 
     (id, title, type, customerId, templateId, createdAt, enterpriseName, enterpriseAddress, 
      planDate, reportDueDate, status, assignedInspectorId, approvedById, approvedAt, reportId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      inspection.title,
      inspection.type,
      inspection.customerId,
      inspection.templateId || null,
      createdAt,
      inspection.enterprise.name,
      inspection.enterprise.address,
      inspection.planDate,
      inspection.reportDueDate,
      status,
      inspection.assignedInspectorId || null,
      inspection.approvedById || null,
      inspection.approvedAt || null,
      inspection.reportId || null,
    ]
  );

  for (const item of inspection.checkItems) {
    await db.runAsync(
      'INSERT INTO check_items (id, inspectionId, text, status) VALUES (?, ?, ?, ?);',
      [item.id, id, item.text, item.status]
    );
  }

  if (inspection.photos && inspection.photos.length > 0) {
    for (const photoUri of inspection.photos) {
      const photoId = generateId('photo');
      await db.runAsync(
        'INSERT INTO inspection_photos (id, inspectionId, photoUri) VALUES (?, ?, ?);',
        [photoId, id, photoUri]
      );
    }
  }

  return {
    ...inspection,
    id,
    status,
    createdAt,
  };
};

export const updateInspection = async (id: string, inspection: Partial<Inspection>): Promise<void> => {
  const db = await getDatabase();
  const existing = await getInspectionById(id);
  if (!existing) throw new Error('Inspection not found');

  if (
    inspection.title ||
    inspection.type ||
    inspection.enterprise ||
    inspection.planDate ||
    inspection.reportDueDate ||
    inspection.status ||
    inspection.assignedInspectorId !== undefined ||
    inspection.approvedById !== undefined ||
    inspection.approvedAt !== undefined ||
    inspection.reportId !== undefined ||
    inspection.templateId !== undefined
  ) {
    await db.runAsync(
      `UPDATE inspections SET 
       title = ?, type = ?, enterpriseName = ?, enterpriseAddress = ?, 
       planDate = ?, reportDueDate = ?, status = ?, 
       assignedInspectorId = ?, approvedById = ?, approvedAt = ?, reportId = ?, templateId = ?
       WHERE id = ?;`,
      [
        inspection.title ?? existing.title,
        inspection.type ?? existing.type,
        inspection.enterprise?.name ?? existing.enterprise.name,
        inspection.enterprise?.address ?? existing.enterprise.address,
        inspection.planDate ?? existing.planDate,
        inspection.reportDueDate ?? existing.reportDueDate,
        inspection.status ?? existing.status,
        inspection.assignedInspectorId !== undefined ? inspection.assignedInspectorId : existing.assignedInspectorId || null,
        inspection.approvedById !== undefined ? inspection.approvedById : existing.approvedById || null,
        inspection.approvedAt !== undefined ? inspection.approvedAt : existing.approvedAt || null,
        inspection.reportId !== undefined ? inspection.reportId : existing.reportId || null,
        inspection.templateId !== undefined ? inspection.templateId : existing.templateId || null,
        id,
      ]
    );
  }

  if (inspection.checkItems) {
    await db.runAsync('DELETE FROM check_items WHERE inspectionId = ?;', [id]);
    for (const item of inspection.checkItems) {
      await db.runAsync(
        'INSERT INTO check_items (id, inspectionId, text, status) VALUES (?, ?, ?, ?);',
        [item.id, id, item.text, item.status]
      );
    }
  }

  if (inspection.photos !== undefined) {
    await db.runAsync('DELETE FROM inspection_photos WHERE inspectionId = ?;', [id]);
    for (const photoUri of inspection.photos) {
      const photoId = generateId('photo');
      await db.runAsync(
        'INSERT INTO inspection_photos (id, inspectionId, photoUri) VALUES (?, ?, ?);',
        [photoId, id, photoUri]
      );
    }
  }
};

export const updateCheckItemStatus = async (
  inspectionId: string,
  itemId: string,
  status: CheckItemStatus
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE check_items SET status = ? WHERE id = ? AND inspectionId = ?;',
    [status, itemId, inspectionId]
  );
};

// ============= REPORTS =============

export const getAllReports = async (): Promise<Report[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM reports ORDER BY createdAt DESC;');

  return rows.map((row) => ({
    id: row.id,
    inspectionId: row.inspectionId,
    createdBy: row.createdBy,
    customerId: row.customerId,
    createdAt: row.createdAt,
    documentPath: row.documentPath,
    editableUntil: row.editableUntil,
    locked: row.locked === 1,
  }));
};

export const getReportById = async (id: string): Promise<Report | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const row = await db.getFirstAsync<any>(`SELECT * FROM reports WHERE id = '${id}';`);

  if (!row) return null;

  return {
    id: row.id,
    inspectionId: row.inspectionId,
    createdBy: row.createdBy,
    customerId: row.customerId,
    createdAt: row.createdAt,
    documentPath: row.documentPath,
    editableUntil: row.editableUntil,
    locked: row.locked === 1,
  };
};

export const createReport = async (report: Omit<Report, 'id' | 'createdAt' | 'locked'>): Promise<Report> => {
  const db = await getDatabase();
  const id = generateId('report');
  const createdAt = new Date().toISOString();
  const locked = true;

  await db.runAsync(
    `INSERT INTO reports (id, inspectionId, createdBy, customerId, createdAt, documentPath, editableUntil, locked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      report.inspectionId,
      report.createdBy,
      report.customerId,
      createdAt,
      report.documentPath,
      report.editableUntil,
      locked ? 1 : 0,
    ]
  );

  // Обновляем inspection.reportId
  await db.runAsync('UPDATE inspections SET reportId = ? WHERE id = ?;', [id, report.inspectionId]);

  return {
    ...report,
    id,
    createdAt,
    locked,
  };
};

export const lockReport = async (reportId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('UPDATE reports SET locked = 1 WHERE id = ?;', [reportId]);
};

// ============= CHATS =============

export const getAllChats = async (): Promise<Chat[]> => {
  const db = await getDatabase();
  const chats = await db.getAllAsync<any>('SELECT * FROM chats ORDER BY id;');

  const result: Chat[] = [];
  for (const chat of chats) {
    // Используем прямую подстановку для ID
    const participants = await db.getAllAsync<{ userId: string }>(
      `SELECT userId FROM chat_participants WHERE chatId = '${chat.id}';`
    );

    const messages = await db.getAllAsync<any>(
      `SELECT * FROM messages WHERE chatId = '${chat.id}' ORDER BY createdAt ASC;`
    );

    const deletedFor = await db.getAllAsync<{ userId: string }>(
      `SELECT userId FROM chat_deleted_for WHERE chatId = '${chat.id}';`
    );

    result.push({
      id: chat.id,
      participantIds: participants.map((p) => p.userId),
      title: chat.title,
      messages: messages.map((msg) => ({
        id: msg.id,
        authorId: msg.authorId,
        text: msg.text,
        createdAt: msg.createdAt,
      })),
      deletedFor: deletedFor.map((d) => d.userId),
    });
  }

  return result;
};

export const getChatById = async (id: string): Promise<Chat | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const chat = await db.getFirstAsync<any>(`SELECT * FROM chats WHERE id = '${id}';`);

  if (!chat) return null;

  const participants = await db.getAllAsync<{ userId: string }>(
    `SELECT userId FROM chat_participants WHERE chatId = '${id}';`
  );

  const messages = await db.getAllAsync<any>(
    `SELECT * FROM messages WHERE chatId = '${id}' ORDER BY createdAt ASC;`
  );

  const deletedFor = await db.getAllAsync<{ userId: string }>(
    `SELECT userId FROM chat_deleted_for WHERE chatId = '${id}';`
  );

  return {
    id: chat.id,
    participantIds: participants.map((p) => p.userId),
    title: chat.title,
    messages: messages.map((msg) => ({
      id: msg.id,
      authorId: msg.authorId,
      text: msg.text,
      createdAt: msg.createdAt,
    })),
    deletedFor: deletedFor.map((d) => d.userId),
  };
};

export const createChat = async (
  participantIds: string[],
  title?: string
): Promise<Chat> => {
  const db = await getDatabase();
  
  // Проверяем существующий чат с теми же участниками
  const uniqueParticipantIds = Array.from(new Set(participantIds));
  const existingChats = await getAllChats();
  const existingChat = existingChats.find(
    (chat) =>
      chat.participantIds.length === uniqueParticipantIds.length &&
      uniqueParticipantIds.every((id) => chat.participantIds.includes(id))
  );

  if (existingChat) {
    return existingChat;
  }

  const id = generateId('chat');
  const chatTitle = title ?? 'Новый чат';

  await db.runAsync('INSERT INTO chats (id, title) VALUES (?, ?);', [id, chatTitle]);

  for (const userId of uniqueParticipantIds) {
    await db.runAsync(
      'INSERT INTO chat_participants (chatId, userId) VALUES (?, ?);',
      [id, userId]
    );
  }

  return {
    id,
    participantIds: uniqueParticipantIds,
    title: chatTitle,
    messages: [],
    deletedFor: [],
  };
};

export const addChatMessage = async (
  chatId: string,
  message: Omit<ChatMessage, 'id' | 'createdAt'>
): Promise<void> => {
  const db = await getDatabase();
  const id = generateId('msg');
  const createdAt = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO messages (id, chatId, authorId, text, createdAt) VALUES (?, ?, ?, ?, ?);',
    [id, chatId, message.authorId, message.text, createdAt]
  );

  // Удаляем из deletedFor если сообщение было от этого пользователя
  await db.runAsync(
    'DELETE FROM chat_deleted_for WHERE chatId = ? AND userId = ?;',
    [chatId, message.authorId]
  );
};

export const updateChatMessage = async (messageId: string, newText: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('UPDATE messages SET text = ? WHERE id = ?;', [newText, messageId]);
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM messages WHERE id = ?;', [messageId]);
};

export const deleteChat = async (chatId: string, userId: string, scope: 'self' | 'all'): Promise<void> => {
  const db = await getDatabase();

  if (scope === 'all') {
    await db.runAsync('DELETE FROM chat_deleted_for WHERE chatId = ?;', [chatId]);
    await db.runAsync('DELETE FROM messages WHERE chatId = ?;', [chatId]);
    await db.runAsync('DELETE FROM chat_participants WHERE chatId = ?;', [chatId]);
    await db.runAsync('DELETE FROM chats WHERE id = ?;', [chatId]);
  } else {
    // Проверяем, не добавлен ли уже
    const existing = await db.getFirstAsync<any>(
      `SELECT * FROM chat_deleted_for WHERE chatId = '${chatId}' AND userId = '${userId}';`
    );
    if (!existing) {
      await db.runAsync(
        'INSERT INTO chat_deleted_for (chatId, userId) VALUES (?, ?);',
        [chatId, userId]
      );
    }
  }
};

// ============= ACCOUNT REQUESTS =============

export const getAllAccountRequests = async (): Promise<AccountRequest[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM account_requests ORDER BY requestedAt DESC;'
  );

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    purpose: row.purpose || '',
    requestedAt: row.requestedAt,
    status: row.status as 'pending' | 'approved' | 'rejected',
    reviewedBy: row.reviewedBy || undefined,
    reviewedAt: row.reviewedAt || undefined,
  }));
};

export const getAccountRequestById = async (id: string): Promise<AccountRequest | null> => {
  const db = await getDatabase();
  // Используем прямую подстановку для ID
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM account_requests WHERE id = '${id}';`
  );

  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as UserRole,
    purpose: row.purpose || '',
    requestedAt: row.requestedAt,
    status: row.status as 'pending' | 'approved' | 'rejected',
    reviewedBy: row.reviewedBy || undefined,
    reviewedAt: row.reviewedAt || undefined,
  };
};

export const createAccountRequest = async (
  request: Omit<AccountRequest, 'id' | 'requestedAt' | 'status'>
): Promise<AccountRequest> => {
  const db = await getDatabase();

  // Проверяем существующего пользователя
  const existingUser = await getUserByUsername(request.username);
  if (existingUser) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  // Проверяем существующий pending запрос
  const existingRequests = await getAllAccountRequests();
  const existingRequest = existingRequests.find(
    (req) => req.username.toLowerCase() === request.username.trim().toLowerCase() && req.status === 'pending'
  );
  if (existingRequest) {
    throw new Error('Запрос с таким логином уже существует');
  }

  const id = generateId('req');
  const requestedAt = new Date().toISOString();
  const status: 'pending' | 'approved' | 'rejected' = 'pending';

  await db.runAsync(
    `INSERT INTO account_requests (id, username, password, role, purpose, requestedAt, status)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [id, request.username, request.password, request.role, request.purpose || '', requestedAt, status]
  );

  return {
    ...request,
    id,
    requestedAt,
    status,
  };
};

export const updateAccountRequest = async (
  id: string,
  request: Partial<AccountRequest>
): Promise<void> => {
  const db = await getDatabase();
  const existing = await getAccountRequestById(id);
  if (!existing) throw new Error('Account request not found');

  await db.runAsync(
    `UPDATE account_requests SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?;`,
    [
      request.status ?? existing.status,
      request.reviewedBy !== undefined ? request.reviewedBy : existing.reviewedBy || null,
      request.reviewedAt !== undefined ? request.reviewedAt : existing.reviewedAt || null,
      id,
    ]
  );
};

