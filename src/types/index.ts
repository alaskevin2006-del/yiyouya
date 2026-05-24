export type TravelSessionStatus =
  | 'planning'
  | 'waiting_departure'
  | 'generating_first_stop'
  | 'active'
  | 'pregenerating_next'
  | 'ended';

export type ModalType =
  | 'petSelect'
  | 'preference'
  | 'worldType'
  | 'invitePetPrompt'
  | 'invitePetSelect'
  | 'destination'
  | 'travelSummary'
  | 'auth'
  | null;

export type WorldType = 'real' | 'fantasy' | 'random';

export type TravelRecordStatus = 'active' | 'completed';

export interface UserProfile {
  id: string;
  authUserId?: string;
  email?: string;
  nickname: string;
  activePetId?: string;
  preferenceText?: string;
  preferenceSummary?: string;
  intimacyValue: number;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  personality: string;
  avatarUrl: string;
  referenceImageUrl: string;
  description: string;
  source: 'mock' | 'custom' | 'future_api';
}

export interface FriendPet {
  petId: string;
  name: string;
  type: string;
  avatarUrl?: string;
  personalityTags: string[];
}

export interface FriendUser {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  bio: string;
  pets: FriendPet[];
  recentLocation?: string;
  recentActivity?: string;
}

export interface CompanionPet {
  userId: string;
  userNickname: string;
  petId: string;
  petName: string;
  petType: string;
  petAvatarUrl?: string;
}

export interface PublicTravelLog {
  id: string;
  user: FriendUser;
  pet: FriendPet;
  location: string;
  travelDate: string;
  summary: string;
  companionPets?: CompanionPet[];
}

export interface UserChatMessage {
  id: string;
  friendUserId: string;
  sender: 'me' | 'friend';
  text: string;
  createdAt: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  tags: string[];
  coverImageUrl: string;
  imageUrls: string[];
  source: 'mock' | 'custom' | 'future_api';
  worldType: WorldType;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'pet' | 'system';
  content: string;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  destinationId: string;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

export interface TravelSession {
  id: string;
  userId: string;
  petId: string;
  destination: Destination;
  worldType: WorldType;
  status: TravelSessionStatus;
  travelPlan: string[];
  messages: ChatMessage[];
  diaryEntries: DiaryEntry[];
  companionPets?: CompanionPet[];
  startedAt: string;
  endedAt?: string;
}

export interface TravelRecord {
  id: string;
  userId: string;
  petId: string;
  destination: Destination;
  worldType: WorldType;
  status: TravelRecordStatus;
  travelIndex: number;
  messages: ChatMessage[];
  diaryEntries: DiaryEntry[];
  companionPets?: CompanionPet[];
  intimacyDelta: number;
  createdAt: string;
  endedAt?: string;
  feedback?: string;
}
