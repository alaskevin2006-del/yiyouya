import type { FriendUser, PublicTravelLog } from '../types';

export const recommendedUsers: FriendUser[] = [
  {
    userId: 'user-lena',
    nickname: 'Lena Explorer',
    avatarUrl: '/mock-images/reykjavik-cover.jpg',
    bio: '喜欢寒冷海岸线和很慢的散步。',
    recentLocation: 'Reykjavik',
    recentActivity: '刚从冰岛瀑布回来',
    pets: [
      {
        petId: 'friend-pet-nova',
        name: 'Nova',
        type: '雪地猫',
        avatarUrl: '/mock-images/pet-cat.png',
        personalityTags: ['安静', '会观察云层'],
      },
    ],
  },
  {
    userId: 'user-kai',
    nickname: 'Wanderer Kai',
    avatarUrl: '/mock-images/kyoto-cover.jpg',
    bio: '收集城市雨声、老街和夜间电车。',
    recentLocation: 'Kyoto',
    recentActivity: '发布了京都雨夜旅行日志',
    pets: [
      {
        petId: 'friend-pet-mochi',
        name: 'Mochi',
        type: '柴犬旅伴',
        avatarUrl: '/mock-images/pet-duck.png',
        personalityTags: ['热情', '路感很好'],
      },
      {
        petId: 'friend-pet-ame',
        name: 'Ame',
        type: '雨滴兔',
        avatarUrl: '/mock-images/pet-dragon.png',
        personalityTags: ['细腻', '喜欢咖啡馆'],
      },
    ],
  },
  {
    userId: 'user-nora',
    nickname: 'Nora',
    avatarUrl: '/mock-images/lisbon-cover.jpg',
    bio: '偏爱海边、书店和不赶路的日落。',
    recentLocation: 'Lisbon',
    recentActivity: '把海边路线收进手账',
    pets: [
      {
        petId: 'friend-pet-miu',
        name: 'Miu',
        type: '云朵猫',
        avatarUrl: '/mock-images/pet-panda.png',
        personalityTags: ['松弛', '喜欢晒太阳'],
      },
    ],
  },
];

export const friendUsers: FriendUser[] = [recommendedUsers[1], recommendedUsers[2]];

export const publicTravelLogs: PublicTravelLog[] = [
  {
    id: 'public-log-001',
    user: recommendedUsers[0],
    pet: recommendedUsers[0].pets[0],
    location: 'Iceland',
    travelDate: '2026-05-18',
    summary: 'Nova 说瀑布像一面会呼吸的银色墙，风把水雾吹到围巾上。',
  },
  {
    id: 'public-log-002',
    user: recommendedUsers[1],
    pet: recommendedUsers[1].pets[0],
    location: 'Kyoto',
    travelDate: '2026-05-21',
    summary: 'Mochi 沿着石板路慢慢走，雨声落在纸伞上，像一段很轻的鼓点。',
    companionPets: [
      {
        userId: 'user-nora',
        userNickname: 'Nora',
        petId: 'friend-pet-miu',
        petName: 'Miu',
        petType: '云朵猫',
        petAvatarUrl: '/mock-images/pet-lumi.png',
      },
    ],
  },
  {
    id: 'public-log-003',
    user: recommendedUsers[2],
    pet: recommendedUsers[2].pets[0],
    location: 'Lisbon',
    travelDate: '2026-05-20',
    summary: 'Miu 在黄色电车窗边看海，带回了瓷砖墙和咖啡香的照片。',
  },
];
