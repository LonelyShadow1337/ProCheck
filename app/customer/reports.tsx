// Экран заказчика "Отчёты": просмотр отчётов по созданным проверкам

import * as FileSystem from 'expo-file-system/legacy';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';

export default function CustomerReportsScreen() {
  const { data, auth, refresh } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openedReportContent, setOpenedReportContent] = useState<{ text: string; title: string } | null>(null);

  const myReports = useMemo(() => {
    if (!currentUser) return [];
    // Заказчик видит отчёты по своим проверкам (по customerId)
    return data.reports.filter((report) => report.customerId === currentUser.id);
  }, [currentUser, data.reports]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  const openReport = async (filePath: string, title: string) => {
    try {
      const fileExists = await FileSystem.getInfoAsync(filePath);
      if (!fileExists.exists) {
        Alert.alert('Файл не найден', 'Отчёт не обнаружен в локальном хранилище');
        return;
      }
      const text = await FileSystem.readAsStringAsync(filePath);
      setOpenedReportContent({ text, title });
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть отчёт');
    }
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Отчёты" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь, чтобы просматривать отчёты</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="Отчёты" subtitle="Отчёты по вашим проверкам" onMenuPress={() => setMenuVisible(true)} />
      <FlatList
        data={myReports}
        keyExtractor={(report) => report.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const inspection = data.inspections.find((inspection) => inspection.id === item.inspectionId);
          const inspector = data.users.find((user) => user.id === item.createdBy);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openReport(item.documentPath, inspection?.title ?? 'Отчёт')}>
              <Text style={styles.cardTitle}>{inspection?.title ?? 'Проверка'}</Text>
              <Text style={styles.cardLine}>Инспектор: {inspector?.fullName ?? 'Неизвестно'}</Text>
              <Text style={styles.cardLine}>Дата отчёта: {new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={styles.cardLine}>Файл: {item.documentPath.split('/').pop()}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>У вас пока нет отчётов</Text>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />

      <Modal
        visible={!!openedReportContent}
        animationType="slide"
        transparent
        onRequestClose={() => setOpenedReportContent(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setOpenedReportContent(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <ScreenHeader title={openedReportContent?.title ?? 'Отчёт'} onMenuPress={() => setOpenedReportContent(null)} />
              <ScrollView style={styles.reportScroll} contentContainerStyle={styles.reportContent}>
                <Text style={styles.reportText}>{openedReportContent?.text ?? ''}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.closeButton} onPress={() => setOpenedReportContent(null)}>
                <Text style={styles.closeButtonText}>Закрыть</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    flex: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
  },
  cardLine: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 6,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
  sheetOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  sheetSafeArea: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  reportScroll: {
  },
  reportContent: {
    padding: 16,
  },
  reportText: {
    fontSize: 14,
    color: '#1f2933',
    lineHeight: 20,
  },
  closeButton: {
    padding: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});


