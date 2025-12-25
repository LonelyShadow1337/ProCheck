// Экран администратора "Проверки": детальный список всех проверок

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
import { Inspection } from '@/types/models';

export default function AdminInspectionsScreen() {
  const { data, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredInspections = useMemo(() => {
    let list = data.inspections;
    if (filterStatus) {
      list = list.filter((inspection) => inspection.status === filterStatus);
    }
    return list.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data.inspections, filterStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openReport = async (reportId: string, title: string) => {
    const report = data.reports.find((r) => r.id === reportId);
    if (!report) {
      Alert.alert('Отчёт не найден');
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(report.documentPath);
      if (!info.exists) {
        Alert.alert('Файл не найден', 'Документ был удалён или перемещён');
        return;
      }
      const text = await FileSystem.readAsStringAsync(report.documentPath);
      Alert.alert(title, text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть документ');
    }
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
    { id: 'all', label: 'Все проверки', onPress: () => setFilterStatus(null) },
    { id: 'pending', label: 'Ожидают утверждения', onPress: () => setFilterStatus('ожидает утверждения') },
    { id: 'assigned', label: 'Назначены', onPress: () => setFilterStatus('назначена') },
    { id: 'in-progress', label: 'Выполняются', onPress: () => setFilterStatus('выполняется') },
    { id: 'completed', label: 'Завершены', onPress: () => setFilterStatus('завершена') },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Проверки"
        subtitle={`Всего: ${filteredInspections.length}`}
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={filteredInspections}
        keyExtractor={(inspection) => inspection.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const customer = data.users.find((u) => u.id === item.customerId);
          const inspector = item.assignedInspectorId
            ? data.users.find((u) => u.id === item.assignedInspectorId)
            : null;
          const report = item.reportId ? data.reports.find((r) => r.id === item.reportId) : null;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedInspection(item)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardLine}>Тип: {item.type}</Text>
              <Text style={styles.cardLine}>Заказчик: {customer?.fullName ?? 'Неизвестно'}</Text>
              <Text style={styles.cardLine}>
                Инспектор: {inspector?.fullName ?? 'Не назначен'}
              </Text>
              <Text style={styles.cardLine}>
                Дата: {new Date(item.planDate).toLocaleString()}
              </Text>
              <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                Статус: {item.status}
              </Text>
              {report && (
                <Text style={styles.cardLine}>
                  Отчёт: {new Date(report.createdAt).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет проверок</Text>
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
        visible={!!selectedInspection}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedInspection(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedInspection(null)}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <SafeAreaView style={styles.modalSafeArea}>
              <ScreenHeader
                title={selectedInspection?.title ?? 'Проверка'}
                onMenuPress={() => setSelectedInspection(null)}
              />
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
                {selectedInspection && (
                  <>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Название</Text>
                      <Text style={styles.detailValue}>{selectedInspection.title}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Тип</Text>
                      <Text style={styles.detailValue}>{selectedInspection.type}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Предприятие</Text>
                      <Text style={styles.detailValue}>{selectedInspection.enterprise.name}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Адрес</Text>
                      <Text style={styles.detailValue}>{selectedInspection.enterprise.address}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Заказчик</Text>
                      <Text style={styles.detailValue}>
                        {data.users.find((u) => u.id === selectedInspection.customerId)?.fullName ??
                          'Неизвестно'}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Инспектор</Text>
                      <Text style={styles.detailValue}>
                        {selectedInspection.assignedInspectorId
                          ? data.users.find((u) => u.id === selectedInspection.assignedInspectorId)
                              ?.fullName ?? 'Неизвестно'
                          : 'Не назначен'}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Плановая дата</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedInspection.planDate).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Срок отчёта</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedInspection.reportDueDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Статус</Text>
                      <Text style={[styles.detailValue, { color: getStatusColor(selectedInspection.status) }]}>
                        {selectedInspection.status}
                      </Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Пунктов проверки</Text>
                      <Text style={styles.detailValue}>{selectedInspection.checkItems.length}</Text>
                    </View>
                    {selectedInspection.reportId && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailLabel}>Отчёт</Text>
                        <TouchableOpacity
                          style={styles.reportButton}
                          onPress={() =>
                            openReport(selectedInspection.reportId!, selectedInspection.title)
                          }>
                          <Text style={styles.reportButtonText}>Просмотреть отчёт</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ожидает утверждения':
      return '#f59e0b';
    case 'назначена':
      return '#3b82f6';
    case 'выполняется':
      return '#8b5cf6';
    case 'завершена':
      return '#22c55e';
    default:
      return '#64748b';
  }
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
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
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
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#1f2933',
  },
  reportButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

