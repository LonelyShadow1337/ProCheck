// Экран администратора "Шаблоны": детальный список всех шаблонов проверок

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MenuAction, MenuModal } from '@/components/ui/menu-modal';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Separator } from '@/components/ui/separator';
import { useAppData } from '@/contexts/AppDataContext';
import { Template } from '@/types/models';

export default function AdminTemplatesScreen() {
  const { data, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const sortedTemplates = useMemo(() => {
    return data.templates.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [data.templates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Шаблоны проверок"
        subtitle={`Всего: ${sortedTemplates.length}`}
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={sortedTemplates}
        keyExtractor={(template) => template.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const creator = data.users.find((u) => u.id === item.createdBy);
          const usageCount = data.inspections.filter((i) => i.templateId === item.id).length;
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedTemplate(item)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description && (
                <Text style={styles.cardDescription}>{item.description}</Text>
              )}
              <Text style={styles.cardLine}>Пунктов: {item.items.length}</Text>
              <Text style={styles.cardLine}>
                Создал: {creator?.fullName ?? 'Неизвестно'}
              </Text>
              <Text style={styles.cardLine}>
                Использований: {usageCount}
              </Text>
              <Text style={styles.cardLine}>
                Обновлён: {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет шаблонов</Text>
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
        visible={!!selectedTemplate}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTemplate(null)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.sheetSafeArea}>
            <ScreenHeader
              title={selectedTemplate?.title ?? 'Шаблон'}
              onMenuPress={() => setSelectedTemplate(null)}
            />
            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled">
              {selectedTemplate && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Название</Text>
                    <Text style={styles.detailValue}>{selectedTemplate.title}</Text>
                  </View>
                  {selectedTemplate.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Описание</Text>
                      <Text style={styles.detailValue}>{selectedTemplate.description}</Text>
                    </View>
                  )}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Создал</Text>
                    <Text style={styles.detailValue}>
                      {data.users.find((u) => u.id === selectedTemplate.createdBy)?.fullName ??
                        'Неизвестно'}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Последнее обновление</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedTemplate.updatedAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Использований в проверках</Text>
                    <Text style={styles.detailValue}>
                      {data.inspections.filter((i) => i.templateId === selectedTemplate.id).length}
                    </Text>
                  </View>
                  <Separator />
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Пункты проверки ({selectedTemplate.items.length})</Text>
                    <View style={styles.detailItems}>
                      {selectedTemplate.items.map((item) => (
                        <View key={item.id} style={styles.detailItem}>
                          <Text style={styles.detailItemText}>{item.text}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
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
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  cardLine: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 4,
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
  modalContainer: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 8,
  },
  detailItems: {
    marginTop: 12,
    gap: 8,
  },
  detailItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  detailItemText: {
    fontSize: 14,
    color: '#1f2933',
  },
});

