import type { ChatMessage, Destination, DiaryEntry, Pet } from '../types';
import { useAppStore } from '../store/appStore';
import { imageService } from './imageService';

const delay = (ms = 500) => new Promise((resolve) => window.setTimeout(resolve, ms));
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

type DiaryAction = 'depart' | 'next';

type TravelStartResponse = {
  petMessage: string;
  travelPlan: {
    destination: string;
    theme: string;
    route: string[];
    reason: string;
  };
  status: 'waiting_departure';
};

type TravelDiaryResponse = {
  petMessage: string;
  diaryEntry: {
    title: string;
    location: string;
    text: string;
    mood: string;
    moodDelta: { happiness: number; healing: number; curiosity: number };
    tags: string[];
    imagePrompt: string;
    imageUrl: string;
  };
  nextSuggestion: string;
};

type TravelMessageResponse = {
  petMessage: string;
  mood: string;
  suggestedAction: 'continue';
};

type PreferenceSummaryResponse = {
  preferenceSummary: string;
  keywords: string[];
  nextRecommendedDestinations: string[];
};

let nextDiaryAction: DiaryAction = 'depart';
let latestStartGreeting = '';
let latestPet: Pet | undefined;
let latestRoute: string[] = [];

const callFunctionJson = async <T>(path: string, payload: Record<string, unknown>): Promise<T | undefined> => {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('[agentService] function http error', response.status, path);
      return undefined;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn('[agentService] function request failed', error);
    return undefined;
  }
};

const fallbackTravelPlan = async (destination: Destination, pet: Pet): Promise<string[]> => {
  await delay();
  return [
    `${pet.name} 先抵达 ${destination.name}，确认天气和第一站路线。`,
    `寻找一个最能代表 ${destination.country} 当地气质的街区或自然景点。`,
    '给主人带回一段图文游记，并等待下一步指令。',
  ];
};

const fallbackDiaryEntry = async (destination: Destination, stopIndex: number): Promise<DiaryEntry> => {
  await delay(700);
  const imageUrl = imageService.getDiaryEntryImage(destination, stopIndex);
  return {
    id: createId('diary'),
    destinationId: destination.id,
    title: `${destination.name} 第 ${stopIndex} 站`,
    content: `宠物抵达了 ${destination.name} 的第 ${stopIndex} 个探索点。它记录下 ${destination.tags.join('、')} 的气息，并把这段体验整理成给主人看的小游记。`,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
};

const fallbackReply = async (message: string, destination: Destination): Promise<ChatMessage> => {
  await delay(400);
  return {
    id: createId('msg'),
    role: 'pet',
    content: `我收到啦。关于“${message}”，我会在 ${destination.name} 的路上多留意一点，再把看到的细节带回来。`,
    createdAt: new Date().toISOString(),
  };
};

const fallbackSummary = async (text: string): Promise<string> => {
  await delay(300);
  if (!text.trim()) {
    return '偏好安静、有故事感、适合慢旅行的目的地。';
  }
  return `偏好总结：${text.trim()}。适合安排节奏舒缓、细节丰富的旅行。`;
};

const stringifyTravelPlan = (value: TravelStartResponse['travelPlan']): string[] => {
  const route = Array.isArray(value.route) ? value.route.map((item) => item.trim()).filter(Boolean) : [];
  const lines: string[] = [];
  if (value.destination.trim()) lines.push(`目的地：${value.destination.trim()}`);
  if (value.theme.trim()) lines.push(`主题：${value.theme.trim()}`);
  if (route.length) lines.push(...route.map((stop, index) => `第${index + 1}站：${stop}`));
  if (value.reason.trim()) lines.push(`为什么：${value.reason.trim()}`);
  return lines.length ? lines : [];
};

const getCurrentPreferencesText = () => {
  const state = useAppStore.getState();
  const preferenceText = state.user.preferenceText?.trim() || '';
  const preferenceSummary = state.preferenceSummary?.trim() || state.user.preferenceSummary?.trim() || '';
  return preferenceText || preferenceSummary;
};

const getCurrentLocationFromRoute = (stopIndex: number) => {
  const idx = Math.max(1, stopIndex) - 1;
  return latestRoute[idx] ?? '';
};

const isGeneratedFallbackImage = (url?: string) => Boolean(url?.includes('_mock-visual.svg'));

export const agentService = {
  markNextDiaryAction(action: DiaryAction) {
    nextDiaryAction = action;
  },

  consumeLatestStartGreeting(destination: Destination) {
    const greeting = latestStartGreeting || `我开始为 ${destination.name} 做出发准备了。`;
    latestStartGreeting = '';
    return greeting;
  },

  async generateTravelPlan(destination: Destination, pet: Pet): Promise<string[]> {
    latestPet = pet;
    const response = await callFunctionJson<TravelStartResponse>('/.netlify/functions/travel-start', {
      destination,
      pet,
      userPreferences: getCurrentPreferencesText(),
    });
    if (!response) return fallbackTravelPlan(destination, pet);

    latestStartGreeting = response.petMessage?.trim() || latestStartGreeting;
    latestRoute = Array.isArray(response.travelPlan?.route) ? response.travelPlan.route.map((item) => String(item).trim()).filter(Boolean) : [];
    const planLines = stringifyTravelPlan(response.travelPlan);
    return planLines.length ? planLines : fallbackTravelPlan(destination, pet);
  },

  async generateDiaryEntry(destination: Destination, stopIndex: number): Promise<DiaryEntry> {
    const action = nextDiaryAction;
    nextDiaryAction = 'next';
    const endpoint = action === 'depart' ? '/.netlify/functions/travel-depart' : '/.netlify/functions/travel-next';
    const response = await callFunctionJson<TravelDiaryResponse>(endpoint, {
      destination,
      pet: latestPet,
      stopIndex,
      route: latestRoute,
      currentLocation: getCurrentLocationFromRoute(stopIndex),
    });
    if (!response) return fallbackDiaryEntry(destination, stopIndex);

    const fallbackEntry = await fallbackDiaryEntry(destination, stopIndex);
    const title = response.diaryEntry?.title?.trim() || `${destination.name} 第 ${stopIndex} 站`;
    const content = response.diaryEntry?.text?.trim() || response.petMessage?.trim() || fallbackEntry.content;
    const responseImageUrl = response.diaryEntry?.imageUrl?.trim() || '';
    const imageUrl = responseImageUrl && !isGeneratedFallbackImage(responseImageUrl) ? responseImageUrl : imageService.getDiaryEntryImage(destination, stopIndex);

    return {
      id: createId('diary'),
      destinationId: destination.id,
      title,
      content,
      imageUrl,
      createdAt: new Date().toISOString(),
    };
  },

  async replyToUserMessage(message: string, destination: Destination): Promise<ChatMessage> {
    const response = await callFunctionJson<TravelMessageResponse>('/.netlify/functions/travel-message', {
      destination,
      pet: latestPet,
      message,
      currentLocation: getCurrentLocationFromRoute(useAppStore.getState().currentSession?.diaryEntries.length ?? 0),
    });
    if (!response) return fallbackReply(message, destination);
    return {
      id: createId('msg'),
      role: 'pet',
      content: response.petMessage?.trim() || (await fallbackReply(message, destination)).content,
      createdAt: new Date().toISOString(),
    };
  },

  async summarizePreferences(text: string): Promise<string> {
    const response = await callFunctionJson<PreferenceSummaryResponse>('/.netlify/functions/preference-summary', {
      text,
    });
    if (!response) return fallbackSummary(text);
    return response.preferenceSummary?.trim() || fallbackSummary(text);
  },
};
