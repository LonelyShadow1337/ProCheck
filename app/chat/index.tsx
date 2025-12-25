// Список чатов текущего пользователя

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
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
import { Chat, User } from '@/types/models';

const getChatTitle = (chat: Chat, currentUser: User | undefined, participants: User[]) => {
  if (chat.title) return chat.title;
  const others = participants.filter((user) => user.id !== currentUser?.id);
  if (others.length === 1) return others[0]?.fullName ?? 'Чат';
  return others.map((user) => user.fullName).join(', ');
};

export default function ChatListScreen() {
  const router = useRouter();
  const { data, auth, refresh, createChat } = useAppData();
  const currentUser = data.users.find((user) => user.id === auth.currentUserId);

  const [menuVisible, setMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);

  const myChats = useMemo(
    () =>
      data.chats.filter((chat) =>
        currentUser
          ? chat.participantIds.includes(currentUser.id) && !(chat.deletedFor ?? []).includes(currentUser.id)
          : false,
      ),
    [data.chats, currentUser],
  );

  const otherUsers = useMemo(
    () => data.users.filter((user) => user.id !== currentUser?.id),
    [data.users, currentUser?.id],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const goToChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  const handleCreateChat = async (participantId: string) => {
    if (!currentUser) return;
    const chat = await createChat([currentUser.id, participantId]);
    setNewChatModalVisible(false);
    router.push(`/chat/${chat.id}`);
  };

  const actions: MenuAction[] = [
    { id: 'refresh', label: 'Обновить список', onPress: handleRefresh },
    { id: 'create', label: 'Новый чат', onPress: () => setNewChatModalVisible(true) },
  ];

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Чаты" onMenuPress={() => setMenuVisible(true)} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Авторизуйтесь, чтобы просматривать чаты</Text>
        </View>
        <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <ScreenHeader title="Чаты" subtitle="Общение с участниками" onMenuPress={() => setMenuVisible(true)} />
      <FlatList
        data={myChats}
        keyExtractor={(chat) => chat.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => {
          const participants = item.participantIds
            .map((participantId) => data.users.find((user) => user.id === participantId))
            .filter(Boolean) as User[];
          const title = getChatTitle(item, currentUser, participants);
          const lastMessage = item.messages[item.messages.length - 1];
          return (
            <TouchableOpacity style={styles.chatCard} onPress={() => goToChat(item.id)}>
              <Text style={styles.chatTitle}>{title}</Text>
              {lastMessage ? (
                <Text style={styles.chatPreview}>
                  {data.users.find((user) => user.id === lastMessage.authorId)?.fullName ?? 'Участник'}:{' '}
                  {lastMessage.text}
                </Text>
              ) : (
                <Text style={styles.chatPreview}>Пока нет сообщений</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Пока нет чатов</Text>
            <TouchableOpacity style={styles.newChatButton} onPress={() => setNewChatModalVisible(true)}>
              <Text style={styles.newChatButtonText}>Создать чат</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} actions={actions} title="Действия" />

      <Modal
        visible={newChatModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNewChatModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setNewChatModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Выберите пользователя</Text>
            <Separator />
            <FlatList
              data={otherUsers}
              keyExtractor={(user) => user.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userItem} onPress={() => handleCreateChat(item.id)}>
                  <Text style={styles.userName}>{item.fullName}</Text>
                  <Text style={styles.userRole}>{item.role}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={Separator}
              ListEmptyComponent={<Text style={styles.emptyText}>Больше нет пользователей</Text>}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setNewChatModalVisible(false)}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
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
  chatCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 6,
  },
  chatPreview: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 12,
  },
  newChatButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  newChatButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2933',
    marginBottom: 12,
  },
  userItem: {
    paddingVertical: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2933',
  },
  userRole: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 4,
  },
  modalClose: {
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    color: '#1d4ed8',
  },
});


