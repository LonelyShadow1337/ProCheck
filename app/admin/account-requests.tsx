// Экран администратора "Запросы на создание аккаунта": просмотр и обработка запросов

import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { AccountRequest, UserRole } from '@/types/models';

const roleTitles: Record<UserRole, string> = {
  admin: 'Администратор',
  customer: 'Заказчик',
  seniorInspector: 'Старший инспектор',
  inspector: 'Инспектор',
};

const statusTitles: Record<AccountRequest['status'], string> = {
  pending: 'Ожидает рассмотрения',
  approved: 'Одобрен',
  rejected: 'Отклонён',
};

export default function AdminAccountRequestsScreen() {
  const { data, auth, refresh, approveAccountRequest, rejectAccountRequest } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  const pendingRequests = useMemo(() => {
    return (data.accountRequests || []).filter((req) => req.status === 'pending');
  }, [data.accountRequests]);

  const allRequests = useMemo(() => {
    return (data.accountRequests || []).sort((a, b) => {
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }, [data.accountRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !currentUser) return;
    setProcessing(true);
    try {
      await approveAccountRequest(selectedRequest.id, currentUser.id);
      await refresh();
      Alert.alert('Запрос одобрен', 'Аккаунт успешно создан');
      setSelectedRequest(null);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось одобрить запрос');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUser) return;
    Alert.alert(
      'Отклонить запрос?',
      'Все данные запроса будут удалены. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отклонить',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await rejectAccountRequest(selectedRequest.id, currentUser.id);
              await refresh();
              Alert.alert('Запрос отклонён', 'Данные запроса удалены');
              setSelectedRequest(null);
            } catch (error: any) {
              Alert.alert('Ошибка', error.message || 'Не удалось отклонить запрос');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить', onPress: handleRefresh },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Запросы на создание аккаунта"
        subtitle={`Ожидают рассмотрения: ${pendingRequests.length}`}
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={allRequests}
        keyExtractor={(request) => request.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const statusColor =
            item.status === 'pending'
              ? '#f59e0b'
              : item.status === 'approved'
                ? '#22c55e'
                : '#ef4444';
          return (
            <TouchableOpacity
              style={[styles.card, item.status === 'pending' && styles.cardPending]}
              onPress={() => setSelectedRequest(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.username}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{statusTitles[item.status]}</Text>
                </View>
              </View>
              <Text style={styles.cardLine}>Роль: {roleTitles[item.role]}</Text>
              <Text style={styles.cardLine}>
                Подано: {new Date(item.requestedAt).toLocaleString()}
              </Text>
              {item.reviewedAt && (
                <Text style={styles.cardLine}>
                  Рассмотрено: {new Date(item.reviewedAt).toLocaleString()}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет запросов на создание аккаунта</Text>
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
        visible={!!selectedRequest}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRequest(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRequest(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}>
            <Pressable style={styles.modalContainer} onPress={() => {}}>
              <SafeAreaView style={styles.modalSafeArea}>
                <ScreenHeader
                  title="Детали запроса"
                  onMenuPress={() => setSelectedRequest(null)}
                />
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalContent}
                  keyboardShouldPersistTaps="handled">
                {selectedRequest && (
                  <>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Имя пользователя (логин)</Text>
                      <Text style={styles.detailValue}>{selectedRequest.username}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Пароль</Text>
                      <Text style={styles.detailValueHint}>
                        Пароль скрыт для безопасности
                      </Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Роль</Text>
                      <Text style={styles.detailValue}>{roleTitles[selectedRequest.role]}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Цель создания аккаунта</Text>
                      <Text style={styles.detailValue}>{selectedRequest.purpose}</Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Дата подачи запроса</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedRequest.requestedAt).toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Статус</Text>
                      <Text style={styles.detailValue}>{statusTitles[selectedRequest.status]}</Text>
                    </View>

                    {selectedRequest.reviewedAt && (
                      <>
                        <View style={styles.detailSection}>
                          <Text style={styles.detailLabel}>Дата рассмотрения</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedRequest.reviewedAt).toLocaleString()}
                          </Text>
                        </View>
                        {selectedRequest.reviewedBy && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailLabel}>Рассмотрел</Text>
                            <Text style={styles.detailValue}>
                              {data.users.find((u) => u.id === selectedRequest.reviewedBy)?.fullName ??
                                'Неизвестно'}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {selectedRequest.status === 'pending' && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.rejectButton, processing && styles.disabled]}
                          onPress={handleReject}
                          disabled={processing}>
                          <Text style={styles.rejectButtonText}>Отклонить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.approveButton, processing && styles.disabled]}
                          onPress={handleApprove}
                          disabled={processing}>
                          <Text style={styles.approveButtonText}>
                            {processing ? 'Обработка...' : 'Одобрить'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
                </ScrollView>
              </SafeAreaView>
            </Pressable>
          </KeyboardAvoidingView>
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  detailValueHint: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

