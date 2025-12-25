// Экран администратора "Пользователи": управление учетными записями

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
import { User, UserRole } from '@/types/models';

const roleTitles: Record<UserRole, string> = {
  admin: 'Администратор',
  customer: 'Заказчик',
  seniorInspector: 'Старший инспектор',
  inspector: 'Инспектор',
};

export default function AdminUsersScreen() {
  const { data, createUser, deleteUser, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterRole, setFilterRole] = useState<UserRole | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'inspector' as UserRole,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredUsers = useMemo(() => {
    if (!filterRole) return data.users;
    return data.users.filter((user) => user.role === filterRole);
  }, [data.users, filterRole]);

  const openCreateModal = () => {
    setNewUser({
      username: '',
      password: '',
      fullName: '',
      role: 'inspector',
    });
    setCreateModalVisible(true);
  };

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim() || !newUser.fullName.trim()) {
      Alert.alert('Заполните поля', 'Для создания пользователя заполните логин, пароль и ФИО');
      return;
    }
    await createUser({
      username: newUser.username.trim(),
      password: newUser.password,
      fullName: newUser.fullName.trim(),
      role: newUser.role,
      profile: {},
    });
    setCreateModalVisible(false);
  };

  const handleDeleteUser = (userId: string, fullName: string) => {
    Alert.alert('Удалить пользователя', `Вы уверены, что хотите удалить ${fullName}?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => deleteUser(userId),
      },
    ]);
  };

  const actions: MenuAction[] = [
    {
      id: 'create',
      label: 'Создать пользователя',
      onPress: openCreateModal,
    },
    {
      id: 'all',
      label: 'Показать всех',
      onPress: () => setFilterRole(undefined),
    },
    {
      id: 'filter-admin',
      label: 'Только администраторы',
      onPress: () => setFilterRole('admin'),
    },
    {
      id: 'filter-senior',
      label: 'Только старшие инспекторы',
      onPress: () => setFilterRole('seniorInspector'),
    },
    {
      id: 'filter-inspector',
      label: 'Только инспекторы',
      onPress: () => setFilterRole('inspector'),
    },
    {
      id: 'filter-customer',
      label: 'Только заказчики',
      onPress: () => setFilterRole('customer'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader
        title="Пользователи"
        subtitle={filterRole ? `Фильтр: ${roleTitles[filterRole]}` : 'Все пользователи системы'}
        onMenuPress={() => setMenuVisible(true)}
      />
      <FlatList
        data={filteredUsers}
        keyExtractor={(user) => user.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userCard} onPress={() => setDetailUser(item)}>
            <View style={styles.userRow}>
              <Text style={styles.userName}>{item.fullName}</Text>
              <Text style={styles.userRole}>{roleTitles[item.role]}</Text>
            </View>
            <Text style={styles.userMeta}>Логин: {item.username}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(event) => {
                  event.stopPropagation?.();
                  handleDeleteUser(item.id, item.fullName);
                }}>
                <Text style={styles.deleteText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Действия"
        actions={actions}
      />

      <Modal
        visible={!!detailUser}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailUser(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setDetailUser(null)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
              <Text style={styles.detailTitle}>{detailUser?.fullName}</Text>
              <Text style={styles.detailSubtitle}>{detailUser ? roleTitles[detailUser.role] : ''}</Text>
              <Separator />
              <Text style={styles.detailLine}>Логин: {detailUser?.username}</Text>
              <Text style={styles.detailLine}>Пароль: скрыт</Text>
              <Text style={styles.detailLine}>
                Специализация: {detailUser?.profile.specialization ?? 'Не указано'}
              </Text>
              <Text style={styles.detailLine}>Рабочие часы: {detailUser?.profile.workHours ?? 'Не указано'}</Text>
              <Text style={styles.detailLine}>Телефон: {detailUser?.profile.phone ?? 'Не указано'}</Text>
              <Text style={styles.detailLine}>E-mail: {detailUser?.profile.email ?? 'Не указано'}</Text>
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    if (!detailUser) return;
                    handleDeleteUser(detailUser.id, detailUser.fullName);
                    setDetailUser(null);
                  }}>
                  <Text style={styles.deleteText}>Удалить пользователя</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={createModalVisible} animationType="slide" transparent>
        <Pressable style={styles.sheetOverlay} onPress={() => setCreateModalVisible(false)}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <SafeAreaView style={styles.sheetSafeArea}>
            <Text style={styles.modalTitle}>Новый пользователь</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Логин"
              value={newUser.username}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, username: value }))}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Пароль"
              value={newUser.password}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, password: value }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="ФИО"
              value={newUser.fullName}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, fullName: value }))}
            />
            <View style={styles.roleSelector}>
              {(Object.keys(roleTitles) as UserRole[]).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    newUser.role === role && styles.roleButtonActive,
                  ]}
                  onPress={() => setNewUser((prev) => ({ ...prev, role }))}>
                  <Text
                    style={[
                      styles.roleButtonText,
                      newUser.role === role && styles.roleButtonTextActive,
                    ]}>
                    {roleTitles[role]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateUser}>
                <Text style={styles.modalSubmitText}>Создать</Text>
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
  userCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
  },
  userRole: {
    fontSize: 13,
    color: '#3b82f6',
  },
  userMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    padding: 20,
    paddingBottom: 28,
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
  detailSubtitle: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 4,
  },
  detailLine: {
    fontSize: 14,
    color: '#52606d',
    marginTop: 10,
  },
  detailActions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#e2e8f0',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  roleButtonText: {
    fontSize: 13,
    color: '#1f2933',
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    borderRadius: 12,
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});


