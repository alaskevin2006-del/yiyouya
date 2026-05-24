import type { ChatMessage, Destination, DiaryEntry, Pet } from '../types';
import { imageService } from './imageService';

type CozeAction = 'start' | 'depart' | 'message' | 'next' | 'summarize';

type CozeAgentData = {
  greeting_bubble?: string;
  journal_content?: string;
  extracted_tags?: string[];
  image_prompt?: string;
  reply_text?: string;
  user_sentiment?: string;
  intimacy_bonus?: number;
  next_suggestion?: string;
  travel_plan?: Record<string, unknown> | string[] | string;
  image_url?: string | null;
};

type CozeAgentResponse = {
  success: boolean;
  action: CozeAction | string;
  data?: CozeAgentData | null;
  error?: string | null;
};

type AgentDestination = Destination & {
  cozeAgentRawOutput?: CozeAgentResponse[];
  cozeImagePrompt?: string;
};

const delay = (ms = 500) => new Promise((resolve) => window.setTimeout(resolve, ms));
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

let nextDiaryAction: Extract<CozeAction, 'depart' | 'next'> = 'depart';
let latestStartGreeting = '';

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringFrom = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = parseMaybeJson(value);
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
  }
  return '';
};

const normalizeTravelPlan = (travelPlan: CozeAgentData['travel_plan'], fallbackText = ''): string[] | undefined => {
  const parsed = parseMaybeJson(travelPlan);
  if (Array.isArray(parsed)) {
    const lines = parsed.map((line) => String(line).trim()).filter(Boolean);
    return lines.length ? lines : undefined;
  }
  if (parsed && typeof parsed === 'object') {
    const lines = Object.entries(parsed as Record<string, unknown>)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.map((item) => String(item).trim()).filter(Boolean).join(', ')}`;
        if (value && typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
        return `${key}: ${String(value ?? '').trim()}`;
      })
      .filter((line) => line.replace(/^[^:]+:\s*/, '').trim());
    return lines.length ? lines : undefined;
  }
  if (typeof parsed === 'string' && parsed.trim()) {
    const lines = parsed
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean);
    return lines.length ? lines : [parsed.trim()];
  }
  return fallbackText ? [fallbackText] : undefined;
};

const mergeTags = (destination: Destination, tags?: string[]) => {
  if (!tags?.length) return destination.tags;
  return Array.from(new Set([...destination.tags, ...tags.filter(Boolean)]));
};

const attachCozeOutput = (destination: Destination, output: CozeAgentResponse): Destination => {
  const current = destination as AgentDestination;
  current.cozeAgentRawOutput = [...(current.cozeAgentRawOutput ?? []), output];
  current.cozeImagePrompt = output.data?.image_prompt ?? current.cozeImagePrompt;
  current.tags = mergeTags(destination, output.data?.extracted_tags);
  return current;
};

const logFallback = (action: CozeAction, reason: string) => {
  console.warn('[Coze] fallback reason', `${action}: ${reason}`);
};

const callCozeAgent = async (
  action: CozeAction,
  payload: Record<string, unknown>,
): Promise<CozeAgentResponse | undefined> => {
  console.warn('[Coze] calling function', action);
  try {
    const response = await fetch('/.netlify/functions/coze-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      logFallback(action, `function http ${response.status}`);
      return undefined;
    }

    const result = (await response.json()) as CozeAgentResponse;
    console.warn('[Coze] function result success', result.success);
    console.warn('[Coze] data keys', Object.keys(result.data || {}));

    if (!result.success) {
      logFallback(action, result.error || 'function returned success:false');
      return undefined;
    }
    if (!result.data) {
      logFallback(action, 'function returned empty data');
      return undefined;
    }
    return result;
  } catch (error) {
    logFallback(action, error instanceof Error ? error.message : 'function request failed');
    return undefined;
  }
};

const fallbackTravelPlan = async (destination: Destination, pet: Pet): Promise<string[]> => {
  await delay();
  return [
    `${pet.name} arrives in ${destination.name} and checks the weather and first route.`,
    `Find a street, landmark, or natural stop that best represents ${destination.country}.`,
    'Bring back a short illustrated travel note, then wait for the next instruction.',
  ];
};

const fallbackDiaryEntry = async (destination: Destination, stopIndex: number): Promise<DiaryEntry> => {
  await delay(700);
  const imageUrl = imageService.getDiaryEntryImage(destination, stopIndex);
  return {
    id: createId('diary'),
    destinationId: destination.id,
    title: `${destination.name} stop ${stopIndex}`,
    content: `The pet reached stop ${stopIndex} in ${destination.name}. It noticed ${destination.tags.join(', ')} and turned the moment into a short travel journal for its owner.`,
    imageUrl,
    createdAt: new Date().toISOString(),
  };
};

const fallbackReply = async (message: string, destination: Destination): Promise<ChatMessage> => {
  await delay(400);
  return {
    id: createId('msg'),
    role: 'pet',
    content: `Got it. About "${message}", I will pay closer attention while exploring ${destination.name} and bring back the details.`,
    createdAt: new Date().toISOString(),
  };
};

const fallbackSummary = async (text: string): Promise<string> => {
  await delay(300);
  if (!text.trim()) {
    return 'Prefers quiet, story-rich destinations that suit slow travel.';
  }
  return `Preference summary: ${text.trim()}. Suitable for relaxed, detail-rich trips.`;
};

export const agentService = {
  markNextDiaryAction(action: Extract<CozeAction, 'depart' | 'next'>) {
    nextDiaryAction = action;
  },

  consumeLatestStartGreeting(destination: Destination) {
    const greeting = latestStartGreeting || `I am getting ready to depart for ${destination.name}.`;
    latestStartGreeting = '';
    return greeting;
  },

  async generateTravelPlan(destination: Destination, pet: Pet): Promise<string[]> {
    const result = await callCozeAgent('start', { destination, pet });
    if (!result?.data) return fallbackTravelPlan(destination, pet);

    attachCozeOutput(destination, result);
    latestStartGreeting = stringFrom(result.data.greeting_bubble, result.data.reply_text, result.data.next_suggestion);
    const fallbackText = stringFrom(result.data.reply_text, result.data.greeting_bubble, result.data.next_suggestion, result.data.journal_content);
    const plan = normalizeTravelPlan(result.data.travel_plan, fallbackText);
    if (!plan?.length) {
      logFallback('start', 'no travel plan or usable text in function data');
      return fallbackTravelPlan(destination, pet);
    }
    return plan;
  },

  async generateDiaryEntry(destination: Destination, stopIndex: number): Promise<DiaryEntry> {
    const action = nextDiaryAction;
    nextDiaryAction = 'next';
    const result = await callCozeAgent(action, { destination, stopIndex });
    if (!result?.data) return fallbackDiaryEntry(destination, stopIndex);

    attachCozeOutput(destination, result);
    const fallbackEntry = await fallbackDiaryEntry(destination, stopIndex);
    const imageUrl = result.data.image_url?.trim() || imageService.getDiaryEntryImage(destination, stopIndex);
    const content = stringFrom(result.data.journal_content, result.data.reply_text, result.data.next_suggestion) || fallbackEntry.content;

    if (content === fallbackEntry.content) logFallback(action, 'no journal/reply text in function data');

    return {
      id: createId('diary'),
      destinationId: destination.id,
      title: stringFrom(result.data.next_suggestion, result.data.greeting_bubble) || `${destination.name} stop ${stopIndex}`,
      content,
      imageUrl,
      createdAt: new Date().toISOString(),
    };
  },

  async replyToUserMessage(message: string, destination: Destination): Promise<ChatMessage> {
    const result = await callCozeAgent('message', { message, user_message: message, destination });
    if (!result?.data) return fallbackReply(message, destination);

    attachCozeOutput(destination, result);
    const fallbackMessage = await fallbackReply(message, destination);
    const content = stringFrom(result.data.reply_text, result.data.next_suggestion, result.data.journal_content, result.data.greeting_bubble) || fallbackMessage.content;

    if (content === fallbackMessage.content) logFallback('message', 'no reply text in function data');

    return {
      id: createId('msg'),
      role: 'pet',
      content,
      createdAt: new Date().toISOString(),
    };
  },

  async summarizePreferences(text: string): Promise<string> {
    const result = await callCozeAgent('summarize', { text, userPreferences: text });
    if (!result?.data) return fallbackSummary(text);
    return stringFrom(result.data.reply_text, result.data.journal_content, result.data.greeting_bubble) || fallbackSummary(text);
  },
};
