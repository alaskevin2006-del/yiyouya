import { agentService } from './agentService';
import type { ChatMessage, CompanionPet, Destination, Pet, TravelRecord, TravelSession, TravelSessionStatus, UserProfile, WorldType } from '../types';

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createPetMessage = (content: string): ChatMessage => ({
  id: createId('msg'),
  role: 'pet',
  content,
  createdAt: new Date().toISOString(),
});

export const travelService = {
  async startTravelSession(
    user: UserProfile,
    pet: Pet,
    destination: Destination,
    worldType: WorldType,
    companionPets: CompanionPet[] = [],
  ): Promise<TravelSession> {
    const travelPlan = await agentService.generateTravelPlan(destination, pet);
    const companionGreeting = companionPets[0]
      ? createPetMessage(`${companionPets[0].petName} 也准备好同行了，我们会一起把 ${destination.name} 的见闻带回来。`)
      : undefined;
    return {
      id: createId('session'),
      userId: user.id,
      petId: pet.id,
      destination,
      worldType,
      status: 'planning',
      travelPlan,
      messages: [createPetMessage(agentService.consumeLatestStartGreeting(destination)), ...(companionGreeting ? [companionGreeting] : [])],
      diaryEntries: [],
      companionPets,
      startedAt: new Date().toISOString(),
    };
  },

  async departTravelSession(session: TravelSession): Promise<TravelSession> {
    agentService.markNextDiaryAction('depart');
    return {
      ...session,
      status: 'generating_first_stop',
      messages: [...session.messages, createPetMessage('我要出发了，第一站图文游记正在路上。')],
    };
  },

  async sendTravelMessage(session: TravelSession, content: string): Promise<ChatMessage> {
    return agentService.replyToUserMessage(content, session.destination);
  },

  async goToNextDestination(session: TravelSession): Promise<TravelSession> {
    agentService.markNextDiaryAction('next');
    return {
      ...session,
      status: 'pregenerating_next',
      messages: [...session.messages, createPetMessage('我去准备下一站，很快回来。')],
    };
  },

  async endTravelSession(session: TravelSession, user: UserProfile): Promise<TravelRecord> {
    const endedAt = new Date().toISOString();
    return {
      id: createId('travel'),
      userId: user.id,
      petId: session.petId,
      destination: session.destination,
      worldType: session.worldType,
      status: 'completed',
      travelIndex: 0,
      messages: [...session.messages, createPetMessage('这次旅行结束啦，我把所有记录都带回家了。')],
      diaryEntries: session.diaryEntries,
      companionPets: session.companionPets,
      intimacyDelta: 1,
      createdAt: session.startedAt,
      endedAt,
    };
  },

  async updateStatus(session: TravelSession, status: TravelSessionStatus): Promise<TravelSession> {
    return Promise.resolve({ ...session, status });
  },
};
