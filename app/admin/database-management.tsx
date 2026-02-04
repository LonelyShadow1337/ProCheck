// Страница администратора для управления базой данных (удаление, изменение данных)

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';
import * as DatabaseService from '@/services/databaseService';

export default function DatabaseManagementScreen() {
  const router = useRouter();
  const { refresh } = useAppData();
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAll = async (
    dataType: string,
    deleteFunction: () => Promise<void>
  ) => {
    Alert.alert(
      `Удалить всё`,
      `Вы уверены, что хотите удалить все ${dataType}? Это действие невозможно отменить.`,
      [
        {
          text: 'Отмена',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Удалить',
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteFunction();
              await refresh();
              Alert.alert('Успешно', `Все ${dataType} удалены`);
            } catch (error) {
              Alert.alert('Ошибка', `Не удалось удалить ${dataType}`);
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleClearDatabase = () => {
    Alert.alert(
      'Очистить всю базу данных',
      'Вы уверены, что хотите удалить ВСЕ данные из базы данных? Это действие невозможно отменить и все пользователи, проверки, отчёты и сообщения будут удалены!',
      [
        {
          text: 'Отмена',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Удалить всё',
          onPress: async () => {
            try {
              setIsLoading(true);
              await DatabaseService.clearDatabase();
              await refresh();
              Alert.alert('Успешно', 'База данных полностью очищена');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить базу данных');
              console.error(error);
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Управление БД"
        subtitle="Удаление и изменение данных"
        onBackPress={() => router.back()}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Удалить данные</Text>
          <Separator />

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('пользователей', DatabaseService.deleteAllUsers)}>
            <Text style={styles.buttonText}>Удалить всех пользователей</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('проверки', DatabaseService.deleteAllInspections)}>
            <Text style={styles.buttonText}>Удалить все проверки</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('отчёты', DatabaseService.deleteAllReports)}>
            <Text style={styles.buttonText}>Удалить все отчёты</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('сообщения', DatabaseService.deleteAllChatMessages)}>
            <Text style={styles.buttonText}>Удалить все сообщения чата</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('чаты', DatabaseService.deleteAllChats)}>
            <Text style={styles.buttonText}>Удалить все чаты</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('шаблоны', DatabaseService.deleteAllTemplates)}>
            <Text style={styles.buttonText}>Удалить все шаблоны</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            disabled={isLoading}
            onPress={() => handleDeleteAll('запросы', DatabaseService.deleteAllAccountRequests)}>
            <Text style={styles.buttonText}>Удалить все запросы на аккаунт</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Опасные операции</Text>
          <Separator />

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Следующие операции невозможно отменить. Будьте осторожны!
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            disabled={isLoading}
            onPress={handleClearDatabase}>
            <Text style={styles.buttonText}>Очистить ВСЮ БД (все таблицы)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  section: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2933',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
});
