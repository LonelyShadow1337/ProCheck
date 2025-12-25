// Экран старшего инспектора "Шаблоны": управление шаблонами проверок

import React, { useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';
import { Template } from '@/types/models';

interface TemplateFormState {
  id?: string;
  title: string;
  description: string;
  items: { id: string; text: string }[];
}

const createEmptyForm = (): TemplateFormState => ({
  title: '',
  description: '',
  items: [{ id: `item-${Date.now()}`, text: 'Новый пункт' }],
});

export default function SeniorTemplatesScreen() {
  const { data, auth, createTemplate, updateTemplate, deleteTemplate, refresh } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(createEmptyForm());

  const templates = useMemo(() => data.templates, [data.templates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setFormState(createEmptyForm());
    setFormVisible(true);
  };

  const openEditModal = (template: Template) => {
    setFormState({
      id: template.id,
      title: template.title,
      description: template.description ?? '',
      items: template.items.map((item) => ({ id: item.id, text: item.text })),
    });
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!formState.title.trim()) {
      Alert.alert('Название обязательно', 'Укажите название шаблона');
      return;
    }
    if (!formState.items.length) {
      Alert.alert('Добавьте пункты', 'Шаблон должен содержать хотя бы один пункт');
      return;
    }

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || undefined,
      items: formState.items.map((item) => ({ id: item.id, text: item.text })),
      createdBy: currentUser.id,
    };

    if (formState.id) {
      await updateTemplate(formState.id, payload);
      Alert.alert('Шаблон обновлён', 'Изменения сохранены');
    } else {
      await createTemplate(payload);
      Alert.alert('Шаблон создан', 'Можно использовать при создании проверок');
    }

    setFormVisible(false);
  };

  const handleDelete = (templateId: string) => {
    Alert.alert('Удалить шаблон', 'Вы уверены, что хотите удалить шаблон?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(templateId);
        },
      },
    ]);
  };

  const actions: MenuAction[] = [
    { id: 'create', label: 'Создать шаблон', onPress: openCreateModal },
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Шаблоны" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь как старший инспектор</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="Шаблоны" subtitle="Управление шаблонами проверок" onMenuPress={() => setMenuVisible(true)} />
      <FlatList
        data={templates}
        keyExtractor={(template) => template.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setDetailTemplate(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
            <Separator />
            <Text style={styles.sectionTitle}>Пункты шаблона</Text>
            {item.items.map((templateItem) => (
              <View key={templateItem.id} style={styles.templateItem}>
                <Text style={styles.templateText}>{templateItem.text}</Text>
              </View>
            ))}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={(event) => {
                  event.stopPropagation?.();
                  openEditModal(item);
                }}>
                <Text style={styles.editText}>Редактировать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(event) => {
                  event.stopPropagation?.();
                  handleDelete(item.id);
                }}>
                <Text style={styles.deleteText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Пока нет шаблонов. Создайте первый.</Text>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />

      <Modal
        visible={!!detailTemplate}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailTemplate(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setDetailTemplate(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <Text style={styles.detailTitle}>{detailTemplate?.title}</Text>
              {detailTemplate?.description ? (
                <Text style={styles.detailSubtitle}>{detailTemplate.description}</Text>
              ) : null}
              <Separator />
              <Text style={styles.sectionTitle}>Пункты</Text>
              <View style={styles.detailItems}>
                {detailTemplate?.items.map((item) => (
                  <View key={item.id} style={styles.detailItem}>
                    <Text style={styles.detailItemText}>{item.text}</Text>
                  </View>
                )) || <Text style={styles.emptyText}>Пункты отсутствуют</Text>}
              </View>
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    if (!detailTemplate) return;
                    setDetailTemplate(null);
                    openEditModal(detailTemplate);
                  }}>
                  <Text style={styles.editText}>Редактировать</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    if (!detailTemplate) return;
                    handleDelete(detailTemplate.id);
                    setDetailTemplate(null);
                  }}>
                  <Text style={styles.deleteText}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
            <Text style={styles.modalTitle}>
              {formState.id ? 'Редактировать шаблон' : 'Новый шаблон'}
            </Text>
            <Separator />
            <Text style={styles.label}>Название</Text>
            <TextInput
              style={styles.input}
              value={formState.title}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, title: value }))}
            />
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={formState.description}
              onChangeText={(value) => setFormState((prev) => ({ ...prev, description: value }))}
              multiline
            />
            <Text style={styles.label}>Пункты</Text>
            <FlatList
              data={formState.items}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={Separator}
              renderItem={({ item, index }) => (
                <View style={styles.modalItem}>
                  <TextInput
                    style={styles.modalInput}
                    value={item.text}
                    onChangeText={(value) =>
                      setFormState((prev) => {
                        const nextItems = [...prev.items];
                        nextItems[index] = { ...nextItems[index], text: value };
                        return { ...prev, items: nextItems };
                      })
                    }
                  />
                  <TouchableOpacity
                    style={styles.modalDelete}
                    onPress={() =>
                      setFormState((prev) => ({
                        ...prev,
                        items: prev.items.filter((current) => current.id !== item.id),
                      }))
                    }>
                    <Text style={styles.modalDeleteText}>Удалить</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Добавьте пункты</Text>}
            />
            <TouchableOpacity
              style={styles.modalAdd}
              onPress={() =>
                setFormState((prev) => ({
                  ...prev,
                  items: [...prev.items, { id: `item-${Date.now()}`, text: 'Новый пункт' }],
                }))
              }>
              <Text style={styles.modalAddText}>Добавить пункт</Text>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFormVisible(false)}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSubmit}>
                <Text style={styles.modalSubmitText}>Сохранить</Text>
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
  cardDescription: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 6,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2933',
  },
  detailSubtitle: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 8,
  },
  detailItems: {
    marginTop: 12,
    gap: 8,
  },
  detailItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailItemText: {
    fontSize: 14,
    color: '#1f2933',
  },
  detailActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 8,
  },
  templateItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  templateText: {
    fontSize: 14,
    color: '#1f2933',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
  },
  editText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  deleteText: {
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 4,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalItem: {
    paddingVertical: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
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
    borderRadius: 10,
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
    borderRadius: 12,
  },
  modalAddText: {
    color: '#1d4ed8',
    fontWeight: '600',
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


