// В этом файле описаны основные типы данных приложения ProCheck

export type UserRole = 'admin' | 'customer' | 'seniorInspector' | 'inspector';

export type CheckItemStatus = 'соответствует' | 'не соответствует' | 'не проверено';

export type InspectionStatus =
  | 'черновик'
  | 'ожидает утверждения'
  | 'утверждена'
  | 'назначена'
  | 'выполняется'
  | 'завершена'
  | 'отменена';

export interface UserProfile {
  avatarUri?: string;
  specialization?: string;
  workHours?: string;
  phone?: string;
  email?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  profile: UserProfile;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participantIds: string[];
  title: string;
  messages: ChatMessage[];
  deletedFor?: string[];
}

export interface CheckItemTemplate {
  id: string;
  text: string;
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  items: CheckItemTemplate[];
  createdBy: string;
  updatedAt: string;
}

export interface CheckItem {
  id: string;
  text: string;
  status: CheckItemStatus;
}

export interface EnterpriseInfo {
  name: string;
  address: string;
}

export interface Inspection {
  id: string;
  title: string;
  type: string;
  customerId: string;
  templateId?: string;
  createdAt: string;
  enterprise: EnterpriseInfo;
  planDate: string;
  reportDueDate: string;
  status: InspectionStatus;
  checkItems: CheckItem[];
  assignedInspectorId?: string;
  approvedById?: string;
  approvedAt?: string;
  reportId?: string;
  photos?: string[];
}

export interface Report {
  id: string;
  inspectionId: string;
  createdBy: string; // ID инспектора, который создал отчёт
  customerId: string; // ID заказчика, который создал проверку
  createdAt: string;
  documentPath: string;
  editableUntil: string;
  locked: boolean;
}

export interface AccountRequest {
  id: string;
  username: string;
  password: string; // Хранится в зашифрованном виде, администратор не видит
  role: UserRole;
  purpose: string; // Описание цели создания аккаунта
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AppDataState {
  users: User[];
  chats: Chat[];
  templates: Template[];
  inspections: Inspection[];
  reports: Report[];
  accountRequests: AccountRequest[];
}

export interface AuthState {
  currentUserId?: string;
  lastLogin?: string;
}


