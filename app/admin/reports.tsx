// Экран администратора "Отчёты": детальный список всех отчётов

import * as FileSystem from 'expo-file-system/legacy';
import { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
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
import * as DatabaseService from '@/services/databaseService';

export default function AdminReportsScreen() {
  const { data, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<{ text: string; title: string; path: string } | null>(null);

  const sortedReports = useMemo(() => {
   return [...data.reports].sort((a, b) => {
     return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data.reports]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openReport = async (reportId: string) => {
    const report = data.reports.find((r) => r.id === reportId);
    if (!report) {
      Alert.alert('Отчёт не найден');
      return;
    }
    const inspection = data.inspections.find((i) => i.id === report.inspectionId);
    try {
      const info = await FileSystem.getInfoAsync(report.documentPath);
      if (!info.exists) {
        Alert.alert('Файл не найден', 'Документ был удалён или перемещён');
        return;
      }
      const text = await FileSystem.readAsStringAsync(report.documentPath);
      if (!text || text.trim().length === 0) {
        Alert.alert('Пустой отчёт', 'Файл существует, но не содержит данных');
        return;
      }
      setReportContent({ text, title: inspection?.title ?? 'Отчёт', path: report.documentPath });
      setSelectedReport(reportId);
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось открыть документ');
    }
  };

  const handleShareReport = async () => {
    if (!reportContent) return;
    try {
      await Share.share({
        title: reportContent.title,
        message: reportContent.text,
        url: reportContent.path,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Ошибка', 'Не удалось поделиться отчётом');
    }
  };

  const handleDeleteReport = () => {
    if (!selectedReport || !reportContent) return;
    Alert.alert(
      'Удалить отчёт',
      `Вы уверены, что хотите удалить отчёт "${reportContent.title}"? Это действие невозможно отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteReportById(selectedReport);
              await refresh();
              setSelectedReport(null);
              setReportContent(null);
              Alert.alert('Успешно', 'Отчёт удалён');
            } catch (error) {
              console.error(error);
              Alert.alert('Ошибка', 'Не удалось удалить отчёт');
            }
          },
        },
      ],
    );
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Отчёты"
        subtitle={`Всего: ${sortedReports.length}`}
        onMenuPress={() => setMenuVisible(true)}
      />
      <View style={styles.filterRow}>
        <Image
          source={require('../../images/filter.png')}
          style={styles.filterIcon}
          resizeMode="contain"
        />
        <Text style={styles.filterText}>
          Сортировка: по дате создания (новые сверху)
        </Text>
      </View>
      <FlatList
        data={sortedReports}
        keyExtractor={(report) => report.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const inspection = data.inspections.find((i) => i.id === item.inspectionId);
          const inspector = data.users.find((u) => u.id === item.createdBy);
          return (
            <TouchableOpacity style={styles.card} onPress={() => openReport(item.id)}>
              <Text style={styles.cardTitle}>{inspection?.title ?? 'Проверка'}</Text>
              <Text style={styles.cardLine}>Инспектор: {inspector?.fullName ?? 'Неизвестно'}</Text>
              <Text style={styles.cardLine}>
                Дата создания: {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.cardLine}>
                Файл: {item.documentPath.split('/').pop()}
              </Text>
              <View style={styles.badges}>
                <View style={[styles.badge, item.locked && styles.badgeLocked]}>
                  <Text style={styles.badgeText}>
                    {item.locked ? 'Заблокирован' : 'Доступен для редактирования'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет отчётов</Text>
          </View>
        }
      />

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Действия"
        actions={actions}
      />

      <Modal
        visible={!!selectedReport && !!reportContent}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedReport(null);
          setReportContent(null);
        }}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setSelectedReport(null);
            setReportContent(null);
          }}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <ScreenHeader
                title={reportContent?.title ?? 'Отчёт'}
                onBackPress={() => {
                  setSelectedReport(null);
                  setReportContent(null);
                }}
              />
              <ScrollView
                style={styles.reportScroll}
                contentContainerStyle={styles.reportContent}
                keyboardShouldPersistTaps="handled">
                <Text style={styles.reportText}>{reportContent?.text ?? ''}</Text>
              </ScrollView>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareReport}>
                  <Text style={styles.shareButtonText}>Скачать и поделиться</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteReport}>
                  <Text style={styles.deleteButtonText}>Удалить</Text>
                </TouchableOpacity>
              </View>
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
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  filterIcon: {
    width: 16,
    height: 16,
    tintColor: '#64748b',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    flexShrink: 1,
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
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#e0f2fe',
  },
  badgeLocked: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    color: '#1f2933',
    fontWeight: '500',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheetContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  sheetSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  reportScroll: {
    flex: 1,
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
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
});

