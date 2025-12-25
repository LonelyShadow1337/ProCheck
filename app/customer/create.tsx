// Экран заказчика "Сделать проверку": создание новой проверки по шаблону или вручную

import React, { useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
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
import { CheckItem, Template } from '@/types/models';

const createEmptyItem = (): CheckItem => ({
  id: `temp-${Date.now()}-${Math.random()}`,
  text: 'Новый пункт проверки',
  status: 'не проверено',
});

export default function CustomerCreateInspectionScreen() {
  const { data, auth, createInspection, refresh } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [enterpriseAddress, setEnterpriseAddress] = useState('');
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportDueDate, setReportDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [checkItems, setCheckItems] = useState<CheckItem[]>([createEmptyItem()]);

  const templates = useMemo(() => data.templates, [data.templates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const applyTemplate = (template: Template) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setType(template.title);
    setCheckItems(
      template.items.map((item) => ({
        id: `${item.id}-${Date.now()}`,
        text: item.text,
        status: 'не проверено',
      })),
    );
  };

  const clearForm = () => {
    setSelectedTemplateId(null);
    setTitle('');
    setType('');
    setEnterpriseName('');
    setEnterpriseAddress('');
    setPlanDate(new Date().toISOString().slice(0, 10));
    setReportDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setCheckItems([createEmptyItem()]);
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    if (!title.trim() || !type.trim() || !enterpriseName.trim() || !enterpriseAddress.trim()) {
      Alert.alert('Заполните обязательные поля', 'Название, тип и данные предприятия обязательны');
      return;
    }

    if (!checkItems.length) {
      Alert.alert('Добавьте пункты', 'Проверка должна содержать хотя бы один пункт');
      return;
    }

    await createInspection({
      title: title.trim(),
      type: type.trim(),
      customerId: currentUser.id,
      templateId: selectedTemplateId ?? undefined,
      enterprise: { name: enterpriseName.trim(), address: enterpriseAddress.trim() },
      planDate: new Date(planDate).toISOString(),
      reportDueDate: new Date(reportDueDate).toISOString(),
      checkItems,
      assignedInspectorId: undefined,
      approvedAt: undefined,
      approvedById: undefined,
      reportId: undefined,
    });

    Alert.alert('Проверка создана', 'Проверка отправлена на утверждение старшему инспектору');
    clearForm();
  };

  const actions: MenuAction[] = [
    { id: 'clear', label: 'Очистить форму', onPress: clearForm },
    { id: 'refresh', label: 'Обновить шаблоны', onPress: handleRefresh },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Создать проверку" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь, чтобы создавать проверки</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="Создать проверку" subtitle="Заполните данные и отправьте на утверждение" onMenuPress={() => setMenuVisible(true)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Шаблоны</Text>
          <Separator />
          <Text style={styles.helperText}>Выберите шаблон или создайте проверку вручную</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateRow}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateChip,
                  selectedTemplateId === template.id && styles.templateChipActive,
                ]}
                onPress={() => applyTemplate(template)}>
                <Text
                  style={[
                    styles.templateChipText,
                    selectedTemplateId === template.id && styles.templateChipTextActive,
                  ]}>
                  {template.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.templateReset} onPress={() => setSelectedTemplateId(null)}>
            <Text style={styles.templateResetText}>Использовать без шаблона</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Основные данные</Text>
          <Separator />
          <Text style={styles.label}>Тема проверки</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Например, Пожарная безопасность" />
          <Text style={styles.label}>Тип проверки</Text>
          <TextInput
            style={styles.input}
            value={type}
            onChangeText={setType}
            placeholder="Например, Плановая проверка"
          />
          <Text style={styles.label}>Предприятие</Text>
          <TextInput
            style={styles.input}
            value={enterpriseName}
            onChangeText={setEnterpriseName}
            placeholder="Название предприятия"
          />
          <Text style={styles.label}>Адрес</Text>
          <TextInput
            style={styles.input}
            value={enterpriseAddress}
            onChangeText={setEnterpriseAddress}
            placeholder="Полный адрес проведения проверки"
          />
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Дата проведения</Text>
              <TextInput
                style={styles.input}
                value={planDate}
                onChangeText={setPlanDate}
                placeholder="ГГГГ-ММ-ДД"
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Срок сдачи отчёта</Text>
              <TextInput
                style={styles.input}
                value={reportDueDate}
                onChangeText={setReportDueDate}
                placeholder="ГГГГ-ММ-ДД"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Пункты проверки</Text>
          <Separator />
          {checkItems.map((item, index) => (
            <View key={item.id} style={styles.checkItem}>
              <Text style={styles.checkIndex}>#{index + 1}</Text>
              <TextInput
                style={styles.checkInput}
                value={item.text}
                onChangeText={(value) =>
                  setCheckItems((prev) => {
                    const next = [...prev];
                    next[index] = { ...next[index], text: value };
                    return next;
                  })
                }
              />
              <TouchableOpacity
                style={styles.checkDelete}
                onPress={() => setCheckItems((prev) => prev.filter((check) => check.id !== item.id))}>
                <Text style={styles.checkDeleteText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addItem} onPress={() => setCheckItems((prev) => [...prev, createEmptyItem()])}>
            <Text style={styles.addItemText}>Добавить пункт</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Создать проверку</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
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
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
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
  },
  helperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  templateRow: {
    marginTop: 12,
  },
  templateChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  templateChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  templateChipText: {
    fontSize: 14,
    color: '#1f2933',
  },
  templateChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  templateReset: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  templateResetText: {
    fontSize: 14,
    color: '#1d4ed8',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  checkItem: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  checkIndex: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  checkInput: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  checkDelete: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
  },
  checkDeleteText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  addItem: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#e0f2fe',
  },
  addItemText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
});


