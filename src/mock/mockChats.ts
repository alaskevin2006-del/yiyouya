import type { UserChatMessage } from '../types';

export const mockChats: Record<string, UserChatMessage[]> = {
  'user-kai': [
    {
      id: 'chat-kai-001',
      friendUserId: 'user-kai',
      sender: 'friend',
      text: 'Mochi 昨天带回了京都雨夜路线，你的小蓝龙下次可以一起走。',
      createdAt: '2026-05-22T09:00:00.000Z',
    },
    {
      id: 'chat-kai-002',
      friendUserId: 'user-kai',
      sender: 'me',
      text: '听起来很适合慢节奏旅行，我会去看看。',
      createdAt: '2026-05-22T09:05:00.000Z',
    },
  ],
  'user-nora': [
    {
      id: 'chat-nora-001',
      friendUserId: 'user-nora',
      sender: 'friend',
      text: 'Miu 最近在整理里斯本海边路线，欢迎来共同旅行。',
      createdAt: '2026-05-21T12:30:00.000Z',
    },
  ],
};
