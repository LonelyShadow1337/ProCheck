// Экран инспектора "Назначенные": список назначенных проверок и управление ими
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';
import { CheckItemStatus, Inspection } from '@/types/models';

type FilterVariant = 'all' | 'назначена' | 'выполняется' | 'завершена';
type SortVariant = 'dateAsc' | 'dateDesc';

const STATUS_OPTIONS: CheckItemStatus[] = ['соответствует', 'не соответствует', 'не проверено'];

const createReportTemplate = (inspection: Inspection, inspectorName: string) => {
  const header = `Отчёт по проверке: ${inspection.title}\nИнспектор: ${inspectorName}\nДата: ${new Date().toLocaleString()}`;
  const enterprise = `Предприятие: ${inspection.enterprise.name}\nАдрес: ${inspection.enterprise.address}\n`;
  const items = inspection.checkItems
    .map(
      (item, index) =>
        `${index + 1}. ${item.text}\n   Статус: ${item.status}\n`,
    )
    .join('\n');
  const conclusion = `Статус проверки: ${inspection.status}\n`;
  return [header, enterprise, items, conclusion].join('\n');
};

export default function InspectorAssignedScreen() {
  const {
    data,
    auth,
    refresh,
    updateCheckItemStatus,
    updateInspection,
    createReport,
  } = useAppData();

  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterVariant>('назначена');
  const [sort, setSort] = useState<SortVariant>('dateAsc');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportDraft, setReportDraft] = useState('');
  const [creatingReport, setCreatingReport] = useState(false);

  const assignedInspections = useMemo(() => {
    const list = data.inspections.filter((inspection) => inspection.assignedInspectorId === currentUser?.id);
    const filtered =
      filter === 'all' ? list : list.filter((inspection) => inspection.status === filter);
    return filtered.sort((a, b) => {
      const dateA = new Date(a.planDate).getTime();
      const dateB = new Date(b.planDate).getTime();
      return sort === 'dateAsc' ? dateA - dateB : dateB - dateA;
    });
  }, [currentUser?.id, data.inspections, filter, sort]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openInspection = (inspection: Inspection) => {
    setSelectedInspection(inspection);
  };

  const changeInspectionStatus = async (status: Inspection['status']) => {
    if (!selectedInspection) return;
    await updateInspection(selectedInspection.id, { status });
    await refresh();
  };

  const onSelectStatus = async (itemId: string, status: CheckItemStatus) => {
    if (!selectedInspection) return;
    await updateCheckItemStatus(selectedInspection.id, itemId, status);
    await refresh();
  };

  const attachPhoto = async () => {
    if (!selectedInspection || !currentUser) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Для добавления фото разрешите доступ к галерее');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const newPhotos = [...(selectedInspection.photos ?? []), result.assets[0].uri];
    await updateInspection(selectedInspection.id, { photos: newPhotos });
    await refresh();
  };

  const removePhoto = async (uri: string) => {
    if (!selectedInspection) return;
    const nextPhotos = (selectedInspection.photos ?? []).filter((photo) => photo !== uri);
    await updateInspection(selectedInspection.id, { photos: nextPhotos });
    await refresh();
  };

  const openReportModal = () => {
    if (!selectedInspection || !currentUser) return;
    setReportDraft(createReportTemplate(selectedInspection, currentUser.fullName));
    setReportModalVisible(true);
  };

  const handleCreateReport = async () => {
    if (!selectedInspection || !currentUser) return;
    setCreatingReport(true);
    try {
      const rootDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!rootDir) {
        Alert.alert('Ошибка', 'Локальное хранилище недоступно');
        setCreatingReport(false);
        return;
      }
      const reportsDir = `${rootDir}reports`;
      const dirInfo = await FileSystem.getInfoAsync(reportsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
      }
      const fileName = `report_${selectedInspection.id}_${Date.now()}.docx`;
      const filePath = `${reportsDir}/${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, reportDraft);

      const report = await createReport({
        inspectionId: selectedInspection.id,
        createdBy: currentUser.id,
        documentPath: filePath,
        editableUntil: new Date().toISOString(),
      });

      await refresh();
      await updateInspection(selectedInspection.id, {status: 'завершена', reportId: report.id,});
      await refresh();
      Alert.alert('Отчёт сохранён', 'Документ сохранён локально и закрыт от редактирования');
      setReportModalVisible(false);
      setSelectedInspection(null);
    } catch {
      Alert.alert('Ошибка', 'Не удалось создать отчёт');
    } finally {
      setCreatingReport(false);
    }
  };

  const actions: MenuAction[] = [
    { id: 'all', label: 'Все проверки', onPress: () => setFilter('all') },
    { id: 'assigned', label: 'Только назначенные', onPress: () => setFilter('назначена') },
    { id: 'progress', label: 'Только выполняющиеся', onPress: () => setFilter('выполняется') },
    { id: 'done', label: 'Завершённые', onPress: () => setFilter('завершена') },
    { id: 'sortAsc', label: 'Сортировать по дате (возр.)', onPress: () => setSort('dateAsc') },
    { id: 'sortDesc', label: 'Сортировать по дате (убыв.)', onPress: () => setSort('dateDesc') },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScreenHeader title="Назначенные проверки" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь как инспектор</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  const inspectionWithFreshData = selectedInspection
    ? data.inspections.find((inspection) => inspection.id === selectedInspection.id) ?? selectedInspection
    : null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Назначенные проверки"
        subtitle="Работайте с пунктами и формируйте отчёты"
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={assignedInspections}
        keyExtractor={(inspection) => inspection.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openInspection(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardLine}>Тип: {item.type}</Text>
            <Text style={styles.cardLine}>Предприятие: {item.enterprise.name}</Text>
            <Text style={styles.cardLine}>Дата: {new Date(item.planDate).toLocaleString()}</Text>
            <Text style={styles.cardLine}>Срок отчёта: {new Date(item.reportDueDate).toLocaleDateString()}</Text>
            <Text style={styles.status}>Статус: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет назначенных проверок</Text>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />

      <Modal
        visible={!!inspectionWithFreshData}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedInspection(null)}>
          <View style={styles.sheetContainer}>
            <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetContainer}>
            <SafeAreaView style={[styles.sheetSafeArea, { flex: 1 }]}>
          <ScreenHeader
            title={inspectionWithFreshData?.title ?? 'Проверка'}
            subtitle="Управление проверкой"
            onMenuPress={() => setSelectedInspection(null)}
          />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {inspectionWithFreshData ? (
                <>
                  <Text style={styles.modalLine}>Предприятие: {inspectionWithFreshData.enterprise.name}</Text>
                  <Text style={styles.modalLine}>Адрес: {inspectionWithFreshData.enterprise.address}</Text>
                  <Text style={styles.modalLine}>
                    Дата проведения: {new Date(inspectionWithFreshData.planDate).toLocaleString()}
                  </Text>
                  <Text style={styles.modalLine}>
                    Срок отчёта: {new Date(inspectionWithFreshData.reportDueDate).toLocaleDateString()}
                  </Text>
                  <Separator />
                  <Text style={styles.sectionTitle}>Статус проверки</Text>
                  <View style={styles.statusRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        inspectionWithFreshData.status === 'назначена' && styles.statusButtonActive,
                      ]}
                      onPress={() => changeInspectionStatus('назначена')}>
                      <Text
                        style={[
                          styles.statusButtonText,
                          inspectionWithFreshData.status === 'назначена' && styles.statusButtonTextActive,
                        ]}>
                        Назначена
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        inspectionWithFreshData.status === 'выполняется' && styles.statusButtonActive,
                      ]}
                      onPress={() => changeInspectionStatus('выполняется')}>
                      <Text
                        style={[
                          styles.statusButtonText,
                          inspectionWithFreshData.status === 'выполняется' && styles.statusButtonTextActive,
                        ]}>
                        Выполняется
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        inspectionWithFreshData.status === 'завершена' && styles.statusButtonActive,
                      ]}
                      onPress={() => changeInspectionStatus('завершена')}>
                      <Text
                        style={[
                          styles.statusButtonText,
                          inspectionWithFreshData.status === 'завершена' && styles.statusButtonTextActive,
                        ]}>
                        Завершена
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Separator />
                  <Text style={styles.sectionTitle}>Пункты проверки</Text>
                  {inspectionWithFreshData.checkItems.map((item) => (
                    <View key={item.id} style={styles.checkCard}>
                      <Text style={styles.checkText}>{item.text}</Text>
                      <View style={styles.statusOptions}>
                        {STATUS_OPTIONS.map((statusOption) => (
                          <TouchableOpacity
                            key={statusOption}
                            style={[
                              styles.optionChip,
                              item.status === statusOption && styles.optionChipActive,
                            ]}
                            onPress={() => onSelectStatus(item.id, statusOption)}>
                            <Text
                              style={[
                                styles.optionChipText,
                                item.status === statusOption && styles.optionChipTextActive,
                              ]}>
                              {statusOption}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  <Separator />
                  <Text style={styles.sectionTitle}>Фотографии</Text>
                  <View style={styles.photoRow}>
                    {(inspectionWithFreshData.photos ?? []).map((uri) => (
                      <View key={uri} style={styles.photoItem}>
                        <Image source={{ uri }} style={styles.photoImage} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(uri)}>
                          <Text style={styles.photoRemoveText}>Удалить</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.photoAdd} onPress={attachPhoto}>
                    <Text style={styles.photoAddText}>Добавить фото</Text>
                  </TouchableOpacity>
                  <Separator />
                  <TouchableOpacity style={styles.reportButton} onPress={openReportModal}>
                    <Text style={styles.reportButtonText}>Создать отчёт (Word)</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </TouchableWithoutFeedback>
            </SafeAreaView>
            </KeyboardAvoidingView>
          </View>
      </Modal>

      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
          <ScreenHeader title="Черновик отчёта" onMenuPress={() => setReportModalVisible(false)} />
          <ScrollView style={styles.reportScroll} contentContainerStyle={styles.reportContent}>
            <TextInput
              style={styles.reportInput}
              value={reportDraft}
              onChangeText={setReportDraft}
              multiline
            />
          </ScrollView>
          <View style={styles.reportActions}>
            <TouchableOpacity style={styles.reportCancel} onPress={() => setReportModalVisible(false)}>
              <Text style={styles.reportCancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportSave}
              onPress={handleCreateReport}
              disabled={creatingReport}>
              <Text style={styles.reportSaveText}>{creatingReport ? 'Сохранение...' : 'Сохранить отчёт'}</Text>
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
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  sheetSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  modalLine: {
    fontSize: 14,
    color: '#1f2933',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#e2e8f0',
  },
  statusButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  statusButtonText: {
    fontSize: 13,
    color: '#1f2933',
    fontWeight: '600',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  checkCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginTop: 8,
  },
  checkText: {
    fontSize: 14,
    color: '#1f2933',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  optionChipActive: {
    backgroundColor: '#22c55e',
  },
  optionChipText: {
    fontSize: 12,
    color: '#334155',
  },
  optionChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoImage: {
    width: '100%',
    height: 90,
  },
  photoRemove: {
    backgroundColor: '#fee2e2',
    paddingVertical: 6,
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  photoAdd: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    alignItems: 'center',
  },
  photoAddText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  reportButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  reportScroll: {
    flex: 1,
  },
  reportContent: {
    padding: 16,
  },
  reportInput: {
    minHeight: 240,
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: '#ffffff',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
  },
  reportCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  reportCancelText: {
    fontSize: 15,
    color: '#64748b',
  },
  reportSave: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#22c55e',
    borderRadius: 12,
  },
  reportSaveText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});


