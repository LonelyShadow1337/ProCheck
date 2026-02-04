// Экран старшего инспектора "Профиль": просмотр и лёгкое редактирование данных профиля

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
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
import { User } from '@/types/models';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { data, auth, updateUserProfile, updateUserPassword, logout, refresh } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<User['profile']>({
    avatarUri: undefined,
    specialization: '',
    workHours: '',
    phone: '',
    email: '',
  });
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  useEffect(() => {
    if (currentUser) {
      setEditableProfile(currentUser.profile);
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    await updateUserProfile(currentUser.id, editableProfile);
    Alert.alert('Профиль обновлён', 'Изменения успешно сохранены');
    setProfileModalVisible(false);
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (currentUser.password !== currentPassword) {
      Alert.alert('Ошибка', 'Текущий пароль указан неверно');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Новые пароли не совпадают');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Ошибка', 'Пароль должен содержать минимум 4 символа');
      return;
    }
    await updateUserPassword(currentUser.id, newPassword);
    Alert.alert('Пароль изменён', 'Пароль успешно обновлён');
    setPasswordModalVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const actions: MenuAction[] = [
    { id: 'chats', label: 'Открыть чаты', onPress: () => router.push('/chat') },
    { id: 'logout', label: 'Выйти из аккаунта', onPress: handleLogout },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Профиль" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Пользователь не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="Профиль" subtitle={currentUser.fullName} onMenuPress={() => setMenuVisible(true)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Общие данные</Text>
          <Separator />
          <Text style={styles.label}>ФИО</Text>
          <Text style={styles.value}>{currentUser.fullName}</Text>
          <Text style={styles.label}>Логин</Text>
          <Text style={styles.value}>{currentUser.username}</Text>
          <Text style={styles.label}>Роль</Text>
          <Text style={styles.value}>{currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'customer' ? 'Заказчик' : currentUser.role === 'inspector' ? 'Инспектор' : currentUser.role === 'seniorInspector' ? 'Старший инспектор' : currentUser.role}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Профиль</Text>
          <Separator />
          <Text style={styles.label}>Специализация</Text>
          <Text style={styles.value}>{currentUser.profile.specialization || '—'}</Text>
          <Text style={styles.label}>Рабочее время</Text>
          <Text style={styles.value}>{currentUser.profile.workHours || '—'}</Text>
          <Text style={styles.label}>Телефон</Text>
          <Text style={styles.value}>{currentUser.profile.phone || '—'}</Text>
          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{currentUser.profile.email || '—'}</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setProfileModalVisible(true)}>
            <Text style={styles.editButtonText}>Редактировать профиль</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Безопасность</Text>
          <Separator />
          <TouchableOpacity style={styles.passwordButton} onPress={() => setPasswordModalVisible(true)}>
            <Text style={styles.passwordButtonText}>Изменить пароль</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Действия"
        actions={actions}
      />

      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPasswordModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPasswordModalVisible(false)}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}>
              <Text style={styles.modalTitle}>Изменить пароль</Text>
              <Text style={styles.label}>Текущий пароль</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Введите текущий пароль"
              />
              <Text style={styles.label}>Новый пароль</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Введите новый пароль"
              />
              <Text style={styles.label}>Подтвердите новый пароль</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Повторите новый пароль"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}>
                  <Text style={styles.modalCancelText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword}>
                  <Text style={styles.modalSaveText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setProfileModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setProfileModalVisible(false)}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Редактировать профиль</Text>
                <Text style={styles.label}>Специализация</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Опишите вашу специализацию"
                  value={editableProfile.specialization ?? ''}
                  onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, specialization: value }))}
                />
                <Text style={styles.label}>Рабочее время</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Например, 09:00 - 18:00"
                  value={editableProfile.workHours ?? ''}
                  onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, workHours: value }))}
                />
                <Text style={styles.label}>Телефон</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+7 ..."
                  value={editableProfile.phone ?? ''}
                  onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, phone: value }))}
                />
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Почта для связи"
                  value={editableProfile.email ?? ''}
                  onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, email: value }))}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => {
                      setProfileModalVisible(false);
                      if (currentUser) {
                        setEditableProfile(currentUser.profile);
                      }
                    }}>
                    <Text style={styles.modalCancelText}>Отмена</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
                    <Text style={styles.modalSaveText}>Сохранить</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  value: {
    fontSize: 15,
    color: '#1f2933',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d9e2ec',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 4,
  },
  editButton: {
    marginTop: 20,
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#b91c1c',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    justifyContent: 'center', // окно по центру 
    alignItems: 'center', 
  }, 
  modalContainer: { 
    flex: 1,
    width: '100%', 
    backgroundColor: '#ffffff', 
    padding: 20, 
  }, 
  modalContent: { 
    flex: 1, 
  }, 
  modalTitle: { 
   fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 16, 
    color: '#1f2933', 
    textAlign: 'center', 
  }, 
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
 }, 
  modalCancel: { 
    flex: 1, 
    marginRight: 8, 
    paddingVertical: 12, 
    backgroundColor: '#e5e7eb', 
    alignItems: 'center', 
    borderRadius: 6, 
  }, 
  modalCancelText: { 
    color: '#374151', 
    fontSize: 15, 
    fontWeight: '500', 
  }, 
  modalSave: { 
    flex: 1, 
    marginLeft: 8, 
    paddingVertical: 12, 
    backgroundColor: '#1d4ed8', 
    alignItems: 'center', 
    borderRadius: 6, 
  }, 
  modalSaveText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600', 
  },
});


