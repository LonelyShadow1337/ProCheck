// Экран старшего инспектора "Утверждение": утверждение проверок и назначение инспекторов

import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { getUsersByRole, useAppData } from '@/contexts/AppDataContext';
import { Inspection } from '@/types/models';

type FilterVariant = 'pending' | 'assigned' | 'inProgress' | 'completed';

const filterToStatus: Record<FilterVariant, Inspection['status'][]> = {
  pending: ['ожидает утверждения'],
  assigned: ['назначена', 'утверждена'],
  inProgress: ['выполняется'],
  completed: ['завершена', 'отменена'],
};

export default function SeniorApprovalsScreen() {
  const { data, auth, updateInspection, refresh } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);
  const inspectors = useMemo(() => getUsersByRole(data.users, 'inspector'), [data.users]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterVariant>('pending');
  const [assignModal, setAssignModal] = useState<{
    visible: boolean;
    inspection?: Inspection;
  }>({ visible: false });
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');

  const inspections = useMemo(() => {
    const statuses = filterToStatus[filter];
    return data.inspections.filter((inspection) => statuses.includes(inspection.status));
  }, [data.inspections, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openAssignModal = (inspection: Inspection) => {
    setAssignModal({ visible: true, inspection });
    setSelectedInspectorId(inspection.assignedInspectorId ?? (inspectors[0]?.id ?? null));
    setScheduledDate(new Date(inspection.planDate).toISOString().slice(0, 10));
    setScheduledTime(new Date(inspection.planDate).toTimeString().slice(0, 5));
  };

  const handleAssign = async () => {
    if (!assignModal.inspection || !currentUser || !selectedInspectorId) return;

    const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    await updateInspection(assignModal.inspection.id, {
      assignedInspectorId: selectedInspectorId,
      status: 'назначена',
      approvedById: currentUser.id,
      approvedAt: new Date().toISOString(),
      planDate: dateTime.toISOString(),
    });
    Alert.alert('Инспектор назначен', 'Инспектор уведомлён о назначенной проверке');
    setAssignModal({ visible: false });
  };

  const handleReject = (inspection: Inspection) => {
    Alert.alert('Отклонить проверку', 'Укажите причину в чате и подтвердите отмену.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Отклонить',
        style: 'destructive',
        onPress: async () => {
          await updateInspection(inspection.id, {
            status: 'отменена',
            approvedById: currentUser?.id,
            approvedAt: new Date().toISOString(),
          });
        },
      },
    ]);
  };

  const actions: MenuAction[] = [
    { id: 'pending', label: 'Ожидают утверждения', onPress: () => setFilter('pending') },
    { id: 'assigned', label: 'Назначенные', onPress: () => setFilter('assigned') },
    { id: 'progress', label: 'Выполняются', onPress: () => setFilter('inProgress') },
    { id: 'done', label: 'Завершённые/Отменённые', onPress: () => setFilter('completed') },
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title="Утверждение проверок" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь как старший инспектор</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Утверждение проверок"
        subtitle="Назначайте инспекторов и контролируйте статус"
        onMenuPress={() => setMenuVisible(true)}
      />
      <View style={styles.filterRow}>
        <Text style={styles.filterText}>
          Фильтр по статусу:{' '}
          {filter === 'pending'
            ? 'Ожидают утверждения'
            : filter === 'assigned'
              ? 'Назначены'
              : filter === 'inProgress'
                ? 'Выполняются'
                : 'Завершённые / Отменённые'}
        </Text>
      </View>
      <FlatList
        data={inspections}
        keyExtractor={(inspection) => inspection.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const customer = data.users.find((user) => user.id === item.customerId);
          const assignedInspector = data.users.find((user) => user.id === item.assignedInspectorId);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardLine}>Заказчик: {customer?.fullName ?? 'Неизвестно'}</Text>
              <Text style={styles.cardLine}>Тип: {item.type}</Text>
              <Text style={styles.cardLine}>Предприятие: {item.enterprise.name}</Text>
              <Text style={styles.cardLine}>Адрес: {item.enterprise.address}</Text>
              <Text style={styles.cardLine}>Плановая дата: {new Date(item.planDate).toLocaleString()}</Text>
              <Text style={styles.cardLine}>Срок отчёта: {new Date(item.reportDueDate).toLocaleDateString()}</Text>
              <Text style={styles.status}>Статус: {item.status}</Text>
              {assignedInspector ? (
                <Text style={styles.cardLine}>Инспектор: {assignedInspector.fullName}</Text>
              ) : (
                <Text style={styles.cardLine}>Инспектор ещё не назначен</Text>
              )}
              <Separator />
              <Text style={styles.sectionTitle}>Пункты проверки</Text>
              {item.checkItems.map((checkItem) => (
                <View key={checkItem.id} style={styles.checkItem}>
                  <Text style={styles.checkText}>{checkItem.text}</Text>
                  <Text style={styles.checkStatus}>{checkItem.status}</Text>
                </View>
              ))}
              <View style={styles.actionsRow}>
                {item.status === 'ожидает утверждения' ? (
                  <TouchableOpacity style={styles.assignButton} onPress={() => openAssignModal(item)}>
                    <Text style={styles.assignText}>Назначить инспектора</Text>
                  </TouchableOpacity>
                ) : null}
                {filter === 'pending' && (
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(item)}>
                    <Text style={styles.rejectText}>Отклонить</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет проверок с выбранным фильтром</Text>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />

      <Modal
        visible={assignModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModal({ visible: false })}>
        <Pressable style={styles.sheetOverlay} onPress={() => setAssignModal({ visible: false })}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
            <Text style={styles.modalTitle}>Назначить инспектора</Text>
            <Separator />
            <Text style={styles.label}>Инспектор</Text>
            <FlatList
              data={inspectors}
              keyExtractor={(user) => user.id}
              ItemSeparatorComponent={Separator}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.inspectorItem,
                    selectedInspectorId === item.id && styles.inspectorItemActive,
                  ]}
                  onPress={() => setSelectedInspectorId(item.id)}>
                  <Text
                    style={[
                      styles.inspectorName,
                      selectedInspectorId === item.id && styles.inspectorNameActive,
                    ]}>
                    {item.fullName}
                  </Text>
                  {item.profile.specialization ? (
                    <Text style={styles.inspectorMeta}>{item.profile.specialization}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Нет доступных инспекторов</Text>}
            />
            <Text style={styles.label}>Дата проведения</Text>
            <TextInput style={styles.input} value={scheduledDate} onChangeText={setScheduledDate} placeholder="ГГГГ-ММ-ДД" />
            <Text style={styles.label}>Время проведения</Text>
            <TextInput style={styles.input} value={scheduledTime} onChangeText={setScheduledTime} placeholder="ЧЧ:ММ" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAssignModal({ visible: false })}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleAssign}>
                <Text style={styles.modalSubmitText}>Назначить</Text>
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
  },
  cardLine: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 6,
  },
  status: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 8,
  },
  checkItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkText: {
    fontSize: 14,
    color: '#1f2933',
  },
  checkStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  assignButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1d4ed8',
  },
  assignText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  rejectButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
  },
  rejectText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  sheetOverlay: {
    flex: 1,
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
    padding: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 4,
  },
  inspectorItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inspectorItemActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  inspectorName: {
    fontSize: 15,
    color: '#1f2933',
    fontWeight: '600',
  },
  inspectorNameActive: {
    color: '#ffffff',
  },
  inspectorMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 15,
    color: '#64748b',
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});


