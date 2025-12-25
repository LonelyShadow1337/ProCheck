// Экран администратора "Отчёты": детальный список всех отчётов

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

export default function AdminReportsScreen() {
  const { data, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<{ text: string; title: string } | null>(null);

  const sortedReports = useMemo(() => {
    return data.reports.sort((a, b) => {
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
      setReportContent({ text, title: inspection?.title ?? 'Отчёт' });
      setSelectedReport(reportId);
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть документ');
    }
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
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <SafeAreaView style={styles.modalSafeArea}>
              <ScreenHeader
                title={reportContent?.title ?? 'Отчёт'}
                onMenuPress={() => {
                  setSelectedReport(null);
                  setReportContent(null);
                }}
              />
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
                <Text style={styles.reportText}>{reportContent?.text ?? ''}</Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setSelectedReport(null);
                  setReportContent(null);
                }}>
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
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
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
    borderRadius: 12,
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
    maxHeight: '90%',
  },
  modalScroll: {
    flex: 1,
    minHeight: 200,
  },
  modalContent: {
    padding: 20,
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

