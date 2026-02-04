// Экран администратора "База данных": сводная информация по локальным данным

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';

export default function AdminDatabaseScreen() {
  const router = useRouter();
  const { data, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const actions: MenuAction[] = [
    {
      id: 'refresh',
      label: 'Обновить данные',
      onPress: handleRefresh,
    },
    {
      id: 'chats',
      label: 'Открыть чаты',
      onPress: () => router.push('/chat'),
    },
    {
      id: 'manage-db',
      label: 'Управление БД',
      onPress: () => router.push('/admin/database-management'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="База данных" subtitle="Сводная информация" onMenuPress={() => setMenuVisible(true)} />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/users')}>
          <Text style={styles.cardTitle}>Пользователи</Text>
          <Separator />
          <Text style={styles.cardLine}>Всего: {data.users.length}</Text>
          <Text style={styles.cardLine}>
            Администраторы: {data.users.filter((user) => user.role === 'admin').length}
          </Text>
          <Text style={styles.cardLine}>
            Старшие инспекторы: {data.users.filter((user) => user.role === 'seniorInspector').length}
          </Text>
          <Text style={styles.cardLine}>
            Инспекторы: {data.users.filter((user) => user.role === 'inspector').length}
          </Text>
          <Text style={styles.cardLine}>Заказчики: {data.users.filter((user) => user.role === 'customer').length}</Text>
          <Text style={styles.cardLink}>Нажмите для просмотра →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/inspections')}>
          <Text style={styles.cardTitle}>Проверки</Text>
          <Separator />
          <Text style={styles.cardLine}>Всего: {data.inspections.length}</Text>
          <Text style={styles.cardLine}>
            Ожидают утверждения:{' '}
            {data.inspections.filter((inspection) => inspection.status === 'ожидает утверждения').length}
          </Text>
          <Text style={styles.cardLine}>
            Назначены:{' '}
            {data.inspections.filter((inspection) => inspection.status === 'назначена').length}
          </Text>
          <Text style={styles.cardLine}>
            Выполняются:{' '}
            {data.inspections.filter((inspection) => inspection.status === 'выполняется').length}
          </Text>
          <Text style={styles.cardLine}>
            Завершены: {data.inspections.filter((inspection) => inspection.status === 'завершена').length}
          </Text>
          <Text style={styles.cardLink}>Нажмите для просмотра →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/templates')}>
          <Text style={styles.cardTitle}>Шаблоны проверок</Text>
          <Separator />
          <Text style={styles.cardLine}>Всего: {data.templates.length}</Text>
          {data.templates.slice(0, 3).map((template) => (
            <View key={template.id} style={styles.templateItem}>
              <Text style={styles.templateTitle}>{template.title}</Text>
              <Text style={styles.templateMeta}>Пунктов: {template.items.length}</Text>
            </View>
          ))}
          {data.templates.length > 3 && (
            <Text style={styles.cardLine}>... и ещё {data.templates.length - 3}</Text>
          )}
          <Text style={styles.cardLink}>Нажмите для просмотра →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/reports')}>
          <Text style={styles.cardTitle}>Отчёты</Text>
          <Separator />
          <Text style={styles.cardLine}>Всего: {data.reports.length}</Text>
          <Text style={styles.cardLine}>
            Заблокированы: {data.reports.filter((report) => report.locked).length}
          </Text>
          <Text style={styles.cardLink}>Нажмите для просмотра →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.chatButton} onPress={() => router.push('/chat')}>
          <Text style={styles.chatButtonText}>Перейти к чатам</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.managementButton} onPress={() => router.push('/admin/database-management')}>
          <Text style={styles.managementButtonText}>Управление данными БД</Text>
        </TouchableOpacity>
      </ScrollView>

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Действия"
        actions={actions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 14,
    color: '#52606d',
    marginBottom: 4,
  },
  templateItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  templateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  templateMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  chatButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  managementButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    alignItems: 'center',
  },
  managementButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardLink: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 8,
    fontWeight: '600',
  },
});


