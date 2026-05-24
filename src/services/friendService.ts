import { mockChats } from '../mock/mockChats';
import { recommendedUsers } from '../mock/mockCommunity';
import type { FriendPet, FriendUser, UserChatMessage } from '../types';
import { communityService } from './communityService';

let chatMessages: Record<string, UserChatMessage[]> = Object.fromEntries(
  Object.entries(mockChats).map(([friendUserId, messages]) => [friendUserId, messages.map((message) => ({ ...message }))]),
);

const cloneUser = (user: FriendUser): FriendUser => ({
  ...user,
  pets: user.pets.map((pet) => ({ ...pet, personalityTags: [...pet.personalityTags] })),
});

export const friendService = {
  async getFriendUsers(): Promise<FriendUser[]> {
    return communityService.getFriendUsers();
  },

  async getFriendUser(friendUserId: string): Promise<FriendUser | undefined> {
    const user = recommendedUsers.find((item) => item.userId === friendUserId);
    return user ? cloneUser(user) : undefined;
  },

  async searchUsers(keyword: string): Promise<FriendUser[]> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return recommendedUsers.map(cloneUser);
    return recommendedUsers
      .filter((user) => user.nickname.toLowerCase().includes(normalizedKeyword) || user.bio.toLowerCase().includes(normalizedKeyword))
      .map(cloneUser);
  },

  async getUserPets(userId: string): Promise<FriendPet[]> {
    const user = recommendedUsers.find((item) => item.userId === userId);
    return user ? user.pets.map((pet) => ({ ...pet, personalityTags: [...pet.personalityTags] })) : [];
  },

  async getChatMessages(friendUserId: string): Promise<UserChatMessage[]> {
    return (chatMessages[friendUserId] ?? []).map((message) => ({ ...message }));
  },

  async sendChatMessage(friendUserId: string, text: string): Promise<UserChatMessage> {
    const message: UserChatMessage = {
      id: `user-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      friendUserId,
      sender: 'me',
      text,
      createdAt: new Date().toISOString(),
    };
    chatMessages = {
      ...chatMessages,
      [friendUserId]: [...(chatMessages[friendUserId] ?? []), message],
    };
    return { ...message };
  },
};
