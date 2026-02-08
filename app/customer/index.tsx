// Экран заказчика "Проверки": список созданных проверок с фильтрами и редактированием пунктов до утверждения

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
import { useAppData } from '@/contexts/AppDataContext';
import { CheckItem, Inspection, User } from '@/types/models';

type SortVariant = 'dateAsc' | 'dateDesc';
type FilterVariant = 'active' | 'all' | Inspection['status'];

const statusTitles: Record<Inspection['status'], string> = {
  черновик: 'Черновик',
  'ожидает утверждения': 'Ожидает утверждения',
  утверждена: 'Утверждена',
  назначена: 'Назначена',
  выполняется: 'Выполняется',
  завершена: 'Завершена',
  отменена: 'Отменена',
};

export default function CustomerInspectionsScreen() {
  const { data, auth, refresh, updateInspection } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortVariant>('dateDesc');
  const [filter, setFilter] = useState<FilterVariant>('active');
  const [detailInspection, setDetailInspection] = useState<Inspection | null>(null);
  const [editModal, setEditModal] = useState<{ visible: boolean; inspection?: Inspection }>({ visible: false });
  const [editedItems, setEditedItems] = useState<CheckItem[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<User | null>(null);

  const myInspections = useMemo(
    () =>
      data.inspections.filter((inspection) => inspection.customerId === currentUser?.id),
    [data.inspections, currentUser?.id],
  );

  const filteredInspections = useMemo(() => {
    let list = myInspections;
    if (filter === 'active') {
      list = list.filter(
        (inspection) => inspection.status !== 'завершена' && inspection.status !== 'отменена',
      );
    } else if (filter !== 'all') {
      list = list.filter((inspection) => inspection.status === filter);
    }
    return list.sort((a, b) => {
      const dateA = new Date(a.planDate).getTime();
      const dateB = new Date(b.planDate).getTime();
      return sort === 'dateAsc' ? dateA - dateB : dateB - dateA;
    });
  }, [filter, myInspections, sort]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openEditModal = (inspection: Inspection) => {
    setEditedItems(inspection.checkItems);
    setEditModal({ visible: true, inspection });
  };

  const handleSaveItems = async () => {
    if (!editModal.inspection) return;
    await updateInspection(editModal.inspection.id, { checkItems: editedItems });
    setEditModal({ visible: false });
    await refresh();
    if (detailInspection && detailInspection.id === editModal.inspection.id) {
      setDetailInspection((prev) =>
        prev && prev.id === editModal.inspection?.id ? { ...prev, checkItems: editedItems } : prev,
      );
    }
    Alert.alert('Пункты обновлены', 'Изменения успешно сохранены');
  };

  const addCheckItem = () => {
    setEditedItems((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        text: 'Новый пункт проверки',
        status: 'не проверено',
      },
    ]);
  };

  const actions: MenuAction[] = [
    { id: 'sortAsc', label: 'Сортировка по дате (раньше → позже)', onPress: () => setSort('dateAsc') },
    { id: 'sortDesc', label: 'Сортировка по дате (позже → раньше)', onPress: () => setSort('dateDesc') },
    { id: 'filterActiveOnly', label: 'Активные проверки', onPress: () => setFilter('active') },
    { id: 'filterAll', label: 'Все проверки', onPress: () => setFilter('all') },
    { id: 'filterPending', label: 'Ожидают утверждения', onPress: () => setFilter('ожидает утверждения') },
    { id: 'filterInProgress', label: 'Выполняются', onPress: () => setFilter('выполняется') },
    { id: 'filterDone', label: 'Завершённые', onPress: () => setFilter('завершена') },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Проверки" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь, чтобы увидеть список проверок</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} title="Действия" actions={actions} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Ваши проверки"
        subtitle={filter === 'all' ? 'Все созданные проверки' : `Фильтр: ${statusTitles[filter as Inspection['status']]}`}
        onMenuPress={() => setMenuVisible(true)}
      />
      <View style={styles.filterRow}>
        <Text style={styles.filterText}>
          Фильтр:{' '}
          {filter === 'all'
            ? 'Все проверки'
            : filter === 'active'
              ? 'Только активные'
              : `Статус = "${statusTitles[filter as Inspection['status']]}"`}
          ; Сортировка: дата проверки ({sort === 'dateAsc' ? 'раньше → позже' : 'позже → раньше'})
        </Text>
      </View>
      <FlatList
        data={filteredInspections}
        keyExtractor={(inspection) => inspection.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const assignedInspector = data.users.find((u) => u.id === item.assignedInspectorId);
          return (
            <TouchableOpacity style={styles.card} onPress={() => setDetailInspection(item)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardLine}>Тип: {item.type}</Text>
              <Text style={styles.cardLine}>Предприятие: {item.enterprise.name}</Text>
              <Text style={styles.cardLine}>Адрес: {item.enterprise.address}</Text>
              {assignedInspector && (
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation?.();
                    setSelectedUserProfile(assignedInspector);
                  }}>
                  <Text style={[styles.cardLine, styles.linkText]}>
                    Назначенный инспектор: {assignedInspector.fullName}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.cardLine}>Дата проверки: {new Date(item.planDate).toLocaleDateString()}</Text>
              <Text style={styles.cardLine}>
                Сдать отчёт до: {new Date(item.reportDueDate).toLocaleDateString()}
              </Text>
              <Text style={styles.status}>{statusTitles[item.status]}</Text>
              <Separator />
              <Text style={styles.sectionTitle}>Пункты проверки</Text>
              {item.checkItems.map((checkItem) => (
                <View key={checkItem.id} style={styles.checkItem}>
                  <Text style={styles.checkText}>{checkItem.text}</Text>
                  <Text style={styles.checkStatus}>{checkItem.status}</Text>
                </View>
              ))}
              {(item.status === 'черновик' || item.status === 'ожидает утверждения') && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    openEditModal(item);
                  }}>
                  <Text style={styles.editButtonText}>Изменить пункты</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Вы ещё не создали ни одной проверки</Text>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} title="Действия" actions={actions} />

      <Modal
        visible={!!detailInspection}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailInspection(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setDetailInspection(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <Text style={styles.detailTitle}>{detailInspection?.title}</Text>
              <Separator />
              <Text style={styles.detailLine}>Тип: {detailInspection?.type}</Text>
              <Text style={styles.detailLine}>Предприятие: {detailInspection?.enterprise.name}</Text>
              <Text style={styles.detailLine}>Адрес: {detailInspection?.enterprise.address}</Text>
              <Text style={styles.detailLine}>
                Дата проверки:{' '}
                {detailInspection ? new Date(detailInspection.planDate).toLocaleDateString() : ''}
              </Text>
              <Text style={styles.detailLine}>
                Срок отчёта:{' '}
                {detailInspection ? new Date(detailInspection.reportDueDate).toLocaleDateString() : ''}
              </Text>
              {detailInspection?.assignedInspectorId && (
                <TouchableOpacity
                  onPress={() => {
                    const inspector = data.users.find((u) => u.id === detailInspection.assignedInspectorId);
                    if (inspector) setSelectedUserProfile(inspector);
                  }}>
                  <Text style={[styles.detailLine, styles.linkText]}>
                    Назначенный инспектор:{' '}
                    {data.users.find((u) => u.id === detailInspection.assignedInspectorId)?.fullName ??
                      'Неизвестно'}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={styles.detailStatus}>
                Статус: {detailInspection ? statusTitles[detailInspection.status] : ''}
              </Text>
              <Separator />
              <Text style={styles.sectionTitle}>Пункты проверки</Text>
              <FlatList
                data={detailInspection?.checkItems ?? []}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={Separator}
                renderItem={({ item }) => (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailItemText}>{item.text}</Text>
                    <Text style={styles.detailItemStatus}>{item.status}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Пункты отсутствуют</Text>}
              />
              {detailInspection &&
              (detailInspection.status === 'черновик' || detailInspection.status === 'ожидает утверждения') ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setDetailInspection(null);
                    openEditModal(detailInspection);
                  }}>
                  <Text style={styles.editButtonText}>Изменить пункты</Text>
                </TouchableOpacity>
              ) : null}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal({ visible: false })}>
        <Pressable style={styles.sheetOverlay} onPress={() => setEditModal({ visible: false })}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
            <Text style={styles.modalTitle}>Редактирование пунктов</Text>
            <Separator />
            <FlatList
              data={editedItems}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={Separator}
              renderItem={({ item, index }) => (
                <View style={styles.modalItem}>
                  <TextInput
                    style={styles.modalInput}
                    value={item.text}
                    onChangeText={(value) =>
                      setEditedItems((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], text: value };
                        return next;
                      })
                    }
                  />
                  <TouchableOpacity
                    style={styles.modalDelete}
                    onPress={() =>
                      setEditedItems((prev) => prev.filter((check) => check.id !== item.id))
                    }>
                    <Text style={styles.modalDeleteText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Добавьте пункты проверки</Text>}
            />
            <TouchableOpacity style={styles.modalAdd} onPress={addCheckItem}>
              <Text style={styles.modalAddText}>Добавить пункт</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditModal({ visible: false })}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveItems}>
                <Text style={styles.modalSubmitText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!selectedUserProfile}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedUserProfile(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSelectedUserProfile(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <Text style={styles.modalTitle}>{selectedUserProfile?.fullName}</Text>
              <Separator />
              <Text style={styles.detailLine}>Роль: {selectedUserProfile?.role}</Text>
              <Text style={styles.detailLine}>
                Специализация: {selectedUserProfile?.profile.specialization ?? 'Не указано'}
              </Text>
              <Text style={styles.detailLine}>
                Рабочее время: {selectedUserProfile?.profile.workHours ?? 'Не указано'}
              </Text>
              <Text style={styles.detailLine}>
                Телефон: {selectedUserProfile?.profile.phone ?? 'Не указано'}
              </Text>
              <Text style={styles.detailLine}>
                E-mail: {selectedUserProfile?.profile.email ?? 'Не указано'}
              </Text>
              <TouchableOpacity
                style={[styles.editButton, { marginTop: 20 }]}
                onPress={() => setSelectedUserProfile(null)}>
                <Text style={styles.editButtonText}>Закрыть</Text>
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
    marginTop: 12,
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
  editButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
  },
  editButtonText: {
    color: '#ffffff',
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
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
  },
  detailLine: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 8,
  },
  detailStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d4ed8',
    marginTop: 12,
  },
  linkText: {
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
  detailItem: {
    paddingVertical: 10,
  },
  detailItemText: {
    fontSize: 14,
    color: '#1f2933',
  },
  detailItemStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  modalItem: {
    paddingVertical: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  modalDelete: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
  },
  modalDeleteText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  modalAdd: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#e0f2fe',
  },
  modalAddText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
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
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});


