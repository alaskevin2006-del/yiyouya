import { friendUsers, publicTravelLogs, recommendedUsers } from '../mock/mockCommunity';
import type { FriendUser, PublicTravelLog } from '../types';

let addedFriendIds = new Set(friendUsers.map((user) => user.userId));

const cloneUser = (user: FriendUser): FriendUser => ({
  ...user,
  pets: user.pets.map((pet) => ({ ...pet, personalityTags: [...pet.personalityTags] })),
});

const cloneLog = (log: PublicTravelLog): PublicTravelLog => ({
  ...log,
  user: cloneUser(log.user),
  pet: { ...log.pet, personalityTags: [...log.pet.personalityTags] },
  companionPets: log.companionPets?.map((pet) => ({ ...pet })),
});

export const communityService = {
  async getPublicTravelLogs(): Promise<PublicTravelLog[]> {
    return publicTravelLogs.map(cloneLog);
  },

  async getRecommendedUsers(): Promise<FriendUser[]> {
    return recommendedUsers.map(cloneUser);
  },

  async getFriendUsers(): Promise<FriendUser[]> {
    return recommendedUsers.filter((user) => addedFriendIds.has(user.userId)).map(cloneUser);
  },

  async addFriend(userId: string): Promise<void> {
    addedFriendIds = new Set([...addedFriendIds, userId]);
  },

  isFriend(userId: string): boolean {
    return addedFriendIds.has(userId);
  },
};
