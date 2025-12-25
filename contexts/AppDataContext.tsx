// Контекст приложения: хранит данные из SQLite базы данных и предоставляет методы управления

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  AccountRequest,
  AppDataState,
  AuthState,
  Chat,
  CheckItem,
  CheckItemStatus,
  Inspection,
  Report,
  Template,
  User,
  UserRole
} from '@/types/models';

import * as dbService from '@/services/databaseService';
import { getDatabase } from '@/services/database';

const AUTH_STORAGE_KEY = 'PROCHECK_AUTH_V1';

// Функция генерации простых уникальных идентификаторов без внешних зависимостей
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const defaultState: AppDataState = {
  users: [],
  chats: [],
  templates: [],
  inspections: [],
  reports: [],
  accountRequests: [],
};

interface AppDataContextValue {
  // Состояние приложения
  data: AppDataState;
  auth: AuthState;
  loading: boolean;

  // Авторизация
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;

  // Пользователи
  createUser: (payload: Omit<User, 'id'>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserProfile: (userId: string, profile: User['profile']) => Promise<void>;

  // Шаблоны
  createTemplate: (payload: Omit<Template, 'id' | 'updatedAt'>) => Promise<Template>;
  updateTemplate: (templateId: string, template: Partial<Template>) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;

  // Проверки
  createInspection: (inspection: Omit<Inspection, 'id' | 'status' | 'createdAt'>) => Promise<Inspection>;
  updateInspection: (inspectionId: string, payload: Partial<Inspection>) => Promise<void>;
  updateCheckItemStatus: (
    inspectionId: string,
    itemId: string,
    status: CheckItemStatus
  ) => Promise<void>;

  // Отчёты
  createReport: (report: Omit<Report, 'id' | 'createdAt' | 'locked' | 'customerId'>) => Promise<Report>;
  lockReport: (reportId: string) => Promise<void>;

  // Чаты
  createChat: (participantIds: string[], title?: string) => Promise<Chat>;
  addChatMessage: (
    chatId: string,
    message: Omit<Chat['messages'][number], 'id' | 'createdAt'>
  ) => Promise<void>;
  deleteChat: (chatId: string, userId: string, scope: 'self' | 'all') => Promise<void>;

  // Запросы на создание аккаунта
  createAccountRequest: (payload: Omit<AccountRequest, 'id' | 'requestedAt' | 'status'>) => Promise<AccountRequest>;
  approveAccountRequest: (requestId: string, adminId: string) => Promise<void>;
  rejectAccountRequest: (requestId: string, adminId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

// Утилита: безопасно извлекать и парсить данные из локального хранилища
const loadFromStorage = async <T,>(key: string): Promise<T | null> => {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? (JSON.parse(json) as T) : null;
  } catch (error) {
    console.warn('Ошибка чтения из AsyncStorage', error);
    return null;
  }
};

// Утилита: безопасно сохранять данные в локальное хранилище
const saveToStorage = async (key: string, value: unknown) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Ошибка сохранения в AsyncStorage', error);
  }
};

// Загрузка всех данных из базы
const loadAllData = async (): Promise<AppDataState> => {
  const [users, chats, templates, inspections, reports, accountRequests] = await Promise.all([
    dbService.getAllUsers(),
    dbService.getAllChats(),
    dbService.getAllTemplates(),
    dbService.getAllInspections(),
    dbService.getAllReports(),
    dbService.getAllAccountRequests(),
  ]);

  return {
    users,
    chats,
    templates,
    inspections,
    reports,
    accountRequests,
  };
};

export const AppDataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [data, setData] = useState<AppDataState>(defaultState);
  const [auth, setAuth] = useState<AuthState>({});
  const [loading, setLoading] = useState(true);

  // Загружаем данные при старте приложения
  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        // Инициализируем базу данных (она создастся или откроется существующая)
        await getDatabase();
        
        // Загружаем все данные из базы
        const loadedData = await loadAllData();
        setData(loadedData);

        // Загружаем состояние авторизации
        const storedAuth = await loadFromStorage<AuthState>(AUTH_STORAGE_KEY);
        if (storedAuth) {
          setAuth(storedAuth);
        }
      } catch (error) {
        console.error('Ошибка при инициализации базы данных:', error);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loadedData = await loadAllData();
      setData(loadedData);

      const storedAuth = await loadFromStorage<AuthState>(AUTH_STORAGE_KEY);
      if (storedAuth) {
        setAuth(storedAuth);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Авторизация пользователя по логину и паролю
  const login = useCallback(
    async (username: string, password: string) => {
      const user = await dbService.getUserByUsername(username);

      if (!user || user.password !== password) {
        return null;
      }

      const nextAuth: AuthState = { currentUserId: user.id, lastLogin: new Date().toISOString() };
      setAuth(nextAuth);
      await saveToStorage(AUTH_STORAGE_KEY, nextAuth);
      return user;
    },
    [],
  );

  // Выход из системы
  const logout = useCallback(async () => {
    const nextAuth: AuthState = {};
    setAuth(nextAuth);
    await saveToStorage(AUTH_STORAGE_KEY, nextAuth);
  }, []);

  // Создание нового пользователя администратором
  const createUser = useCallback(
    async (payload: Omit<User, 'id'>) => {
      const newUser = await dbService.createUser(payload);

      // При создании нового пользователя формируем чат с администратором
      const allUsers = await dbService.getAllUsers();
      const adminUser = allUsers.find((user) => user.role === 'admin');
      
      if (adminUser) {
        const chat = await dbService.createChat(
          [adminUser.id, newUser.id],
          `Чат с администратором (${payload.fullName})`
        );
        
        await dbService.addChatMessage(
          chat.id,
          {
            authorId: adminUser.id,
            text: 'Добро пожаловать в ProCheck! Вы можете обратиться ко мне за помощью в этом чате.',
          }
        );
      }

      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);

      return newUser;
    },
    [],
  );

  // Удаление пользователя
  const deleteUser = useCallback(
    async (userId: string) => {
      await dbService.deleteUser(userId);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Обновление профиля
  const updateUserProfile = useCallback(
    async (userId: string, profile: User['profile']) => {
      const user = await dbService.getUserById(userId);
      if (!user) throw new Error('User not found');

      await dbService.updateUser(userId, { ...user, profile });
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Создание шаблона
  const createTemplate = useCallback(
    async (payload: Omit<Template, 'id' | 'updatedAt'>) => {
      const newTemplate = await dbService.createTemplate(payload);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
      
      return newTemplate;
    },
    [],
  );

  // Обновление шаблона
  const updateTemplate = useCallback(
    async (templateId: string, template: Partial<Template>) => {
      await dbService.updateTemplate(templateId, template);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Удаление шаблона
  const deleteTemplate = useCallback(
    async (templateId: string) => {
      await dbService.deleteTemplate(templateId);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Создание проверки заказчиком
  const createInspection = useCallback(
    async (inspection: Omit<Inspection, 'id' | 'status' | 'createdAt'>) => {
      const checkItems: CheckItem[] = inspection.checkItems.map((item) => ({
        ...item,
        id: item.id || generateId('check'),
        status: item.status ?? 'не проверено',
      }));

      const newInspection = await dbService.createInspection({
        ...inspection,
        checkItems,
      });
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
      
      return newInspection;
    },
    [],
  );

  // Обновление проверки
  const updateInspection = useCallback(
    async (inspectionId: string, payload: Partial<Inspection>) => {
      await dbService.updateInspection(inspectionId, payload);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Обновление статуса пункта проверки
  const updateCheckItemStatus = useCallback(
    async (inspectionId: string, itemId: string, status: CheckItemStatus) => {
      await dbService.updateCheckItemStatus(inspectionId, itemId, status);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Создание отчёта инспектором
  const createReport = useCallback(
    async (reportInput: Omit<Report, 'id' | 'createdAt' | 'locked' | 'customerId'>): Promise<Report> => {
      // Получаем проверку, чтобы узнать customerId
      const inspection = await dbService.getInspectionById(reportInput.inspectionId);
      if (!inspection) {
        throw new Error('Проверка не найдена');
      }

      const newReport = await dbService.createReport({
        ...reportInput,
        customerId: inspection.customerId,
      });
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
      
      return newReport;
    },
    []
  );

  // Фиксация отчёта (после редактирования)
  const lockReport = useCallback(
    async (reportId: string): Promise<void> => {
      await dbService.lockReport(reportId);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    []
  );

  // Создание чата между пользователями
  const createChat = useCallback(
    async (participantIds: string[], title?: string) => {
      const newChat = await dbService.createChat(participantIds, title);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
      
      return newChat;
    },
    [],
  );

  // Добавление сообщения в чат
  const addChatMessage = useCallback(
    async (chatId: string, message: Omit<Chat['messages'][number], 'id' | 'createdAt'>) => {
      await dbService.addChatMessage(chatId, message);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Удаление чата: либо только для текущего пользователя, либо для всех участников
  const deleteChat = useCallback(
    async (chatId: string, userId: string, scope: 'self' | 'all') => {
      await dbService.deleteChat(chatId, userId, scope);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Создание запроса на создание аккаунта
  const createAccountRequest = useCallback(
    async (payload: Omit<AccountRequest, 'id' | 'requestedAt' | 'status'>) => {
      const newRequest = await dbService.createAccountRequest(payload);
      
      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
      
      return newRequest;
    },
    [],
  );

  // Одобрение запроса на создание аккаунта
  const approveAccountRequest = useCallback(
    async (requestId: string, adminId: string) => {
      const request = await dbService.getAccountRequestById(requestId);
      if (!request || request.status !== 'pending') {
        throw new Error('Запрос не найден или уже обработан');
      }

      // Проверяем, не существует ли уже пользователь с таким username
      const existingUser = await dbService.getUserByUsername(request.username);
      if (existingUser) {
        throw new Error('Пользователь с таким логином уже существует');
      }

      // Создаём пользователя
      const newUser = await dbService.createUser({
        username: request.username.trim(),
        password: request.password,
        role: request.role,
        fullName: request.username.trim(),
        profile: {},
      });

      // Обновляем запрос
      await dbService.updateAccountRequest(requestId, {
        ...request,
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
      });

      // Создаём чат с администратором
      const adminUser = await dbService.getUserById(adminId);
      if (adminUser) {
        const chat = await dbService.createChat([adminId, newUser.id], `Чат с администратором (${newUser.username})`);
        
        await dbService.addChatMessage(chat.id, {
          authorId: adminId,
          text: 'Добро пожаловать в ProCheck! Ваш аккаунт был создан. Вы можете обратиться ко мне за помощью в этом чате.',
        });
      }

      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  // Отклонение запроса на создание аккаунта
  const rejectAccountRequest = useCallback(
    async (requestId: string, adminId: string) => {
      const request = await dbService.getAccountRequestById(requestId);
      if (!request || request.status !== 'pending') {
        throw new Error('Запрос не найден или уже обработан');
      }

      await dbService.updateAccountRequest(requestId, {
        ...request,
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date().toISOString(),
      });

      // Обновляем данные
      const loadedData = await loadAllData();
      setData(loadedData);
    },
    [],
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      auth,
      loading,
      login,
      logout,
      refresh,
      createUser,
      deleteUser,
      updateUserProfile,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createInspection,
      updateInspection,
      updateCheckItemStatus,
      createReport,
      lockReport,
      addChatMessage,
      deleteChat,
      createChat,
      createAccountRequest,
      approveAccountRequest,
      rejectAccountRequest,
    }),
    [
      data,
      auth,
      loading,
      login,
      logout,
      refresh,
      createUser,
      deleteUser,
      updateUserProfile,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      createInspection,
      updateInspection,
      updateCheckItemStatus,
      createReport,
      lockReport,
      addChatMessage,
      deleteChat,
      createChat,
      createAccountRequest,
      approveAccountRequest,
      rejectAccountRequest,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData должен использоваться внутри AppDataProvider');
  }
  return context;
};

// Вспомогательная функция для фильтрации списка пользователей по роли
export const getUsersByRole = (users: User[], role: UserRole) => users.filter((user) => user.role === role);

// Вспомогательная функция для получения связанных данных проверки
export const getInspectionMeta = (
  inspections: Inspection[],
  templates: Template[],
  reports: Report[],
  inspectionId: string,
) => {
  const inspection = inspections.find((item) => item.id === inspectionId);
  if (!inspection) {
    return null;
  }

  const template = inspection.templateId ? templates.find((item) => item.id === inspection.templateId) : undefined;
  const report = inspection.reportId ? reports.find((item) => item.id === inspection.reportId) : undefined;

  return { inspection, template, report };
};
