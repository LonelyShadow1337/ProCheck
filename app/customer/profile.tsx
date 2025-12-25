// Экран заказчика "Профиль": просмотр и изменение контактных данных

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

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { data, auth, updateUserProfile, updateUserPassword, refresh, logout } = useAppData();
  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editableProfile, setEditableProfile] = useState<User['profile']>({});
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
    { id: 'save', label: 'Сохранить профиль', onPress: handleSave },
    { id: 'chat', label: 'Открыть чаты', onPress: () => router.push('/chat') },
    { id: 'logout', label: 'Выйти', onPress: handleLogout },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Профиль" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь, чтобы редактировать профиль</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
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
          <Text style={styles.cardTitle}>Основные данные</Text>
          <Separator />
          <Text style={styles.label}>Название компании</Text>
          <Text style={styles.value}>{currentUser.fullName}</Text>
          <Text style={styles.label}>Логин</Text>
          <Text style={styles.value}>{currentUser.username}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Контакты</Text>
          <Separator />
          <Text style={styles.label}>Специализация</Text>
          <TextInput
            style={styles.input}
            value={editableProfile.specialization ?? ''}
            onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, specialization: value }))}
          />
          <Text style={styles.label}>Рабочие часы</Text>
          <TextInput
            style={styles.input}
            value={editableProfile.workHours ?? ''}
            onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, workHours: value }))}
          />
          <Text style={styles.label}>Телефон</Text>
          <TextInput
            style={styles.input}
            value={editableProfile.phone ?? ''}
            onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, phone: value }))}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={editableProfile.email ?? ''}
            onChangeText={(value) => setEditableProfile((prev) => ({ ...prev, email: value }))}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Сохранить</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
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
  passwordButton: {
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '600',
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


