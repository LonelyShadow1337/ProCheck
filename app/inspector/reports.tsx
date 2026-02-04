// Экран инспектора "Отчёты"
import * as FileSystem from 'expo-file-system/legacy';
import { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    Share,
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

export default function InspectorReportsScreen() {
  const { data, auth, refresh } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openedReport, setOpenedReport] = useState<{ text: string; title: string; path: string } | null>(null);

  // Обновление данных
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Действия меню
  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  // Отчёты, доступные текущему пользователю
  const myReports = useMemo(() => {
    if (!currentUser) return [];

    // Администратор видит все отчёты
    if (currentUser.role === 'admin') {
      return data.reports;
    }

    // Инспектор видит отчёты, которые он создал (по createdBy)
    if (currentUser.role === 'inspector') {
      return data.reports.filter((report) => report.createdBy === currentUser.id);
    }

    // Заказчик видит отчёты по своим проверкам (по customerId)
    if (currentUser.role === 'customer') {
      return data.reports.filter((report) => report.customerId === currentUser.id);
    }

    // Старший инспектор не видит отчёты
    return [];
  }, [currentUser, data.reports]);

  // Открытие отчёта
  const openReport = async (path: string, title: string) => {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        Alert.alert('Файл не найден', 'Документ был удалён или перемещён');
        return;
      }
      const text = await FileSystem.readAsStringAsync(path);
      setOpenedReport({ text, title, path });
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть документ');
    }
  };

  const handleShare = async () => {
    if (!openedReport) return;
    try {
      await Share.share({
        title: openedReport.title,
        message: openedReport.text,
        url: openedReport.path,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Ошибка', 'Не удалось поделиться отчётом');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Отчёты"
        subtitle="Список созданных документов"
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={myReports}
        keyExtractor={(report) => report.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const inspection = data.inspections.find((i) => i.id === item.inspectionId);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{inspection?.title ?? 'Проверка'}</Text>
              <Text style={styles.cardLine}>Дата: {new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={styles.cardLine}>Файл: {item.documentPath.split('/').pop()}</Text>
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => openReport(item.documentPath, inspection?.title ?? 'Отчёт')}
              >
                <Text style={styles.openButtonText}>Просмотреть</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет доступных отчётов</Text>
          </View>
        }
      />

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        actions={actions}
        title="Действия"
      />

      <Modal visible={!!openedReport} animationType="slide" onRequestClose={() => setOpenedReport(null)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <ScreenHeader
            title={openedReport?.title ?? 'Отчёт'}
            onBackPress={() => setOpenedReport(null)}
          />
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.reportText}>{openedReport?.text ?? ''}</Text>
          </ScrollView>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Скачать и поделиться</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setOpenedReport(null)}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  openButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  reportText: {
    fontSize: 14,
    color: '#1f2933',
    lineHeight: 20,
  },
  modalClose: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
