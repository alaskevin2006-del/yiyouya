import { callDeepSeekJson, loadSkillPromptBundle } from './_deepseek.ts';

type HandlerEvent = {
  httpMethod: string;
  body: string | null;
};

type HandlerResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type DestinationInput = {
  name?: string;
  country?: string;
  description?: string;
  tags?: string[];
};

type PetInput = {
  name?: string;
  species?: string;
  personality?: string;
  description?: string;
};

type TravelStartBody = {
  destination?: DestinationInput;
  pet?: PetInput;
  userPreferences?: string;
};

export type TravelStartResponseBody = {
  petMessage: string;
  travelPlan: {
    destination: string;
    theme: string;
    route: string[];
    reason: string;
  };
  status: 'waiting_departure';
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const jsonResponse = (statusCode: number, body: unknown, extraHeaders?: Record<string, string>): HandlerResponse => ({
  statusCode,
  headers: { ...headers, ...(extraHeaders ?? {}) },
  body: JSON.stringify(body),
});

const toObject = (value: string | null): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
};

const ensureString = (value: unknown) => (typeof value === 'string' ? value : '');

const fallback = (destination: DestinationInput, pet: PetInput): TravelStartResponseBody => ({
  petMessage: `${pet.name || '宠物'}已经准备好出发去${destination.name || '目的地'}。`,
  travelPlan: {
    destination: destination.name || '',
    theme: '轻松旅行',
    route: [destination.name || '第一站', '第二站', '第三站'].filter(Boolean),
    reason: destination.description || '根据你的偏好选择一条轻松的路线。',
  },
  status: 'waiting_departure',
});

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Only POST is supported.' });

  const body = toObject(event.body) as TravelStartBody;
  const destination = body.destination ?? {};
  const pet = body.pet ?? {};
  const userPreferences = ensureString(body.userPreferences);

  const systemPrompt = await loadSkillPromptBundle(['skill', 'travel', 'image']);
  const outputSchema = [
    '你必须输出且只能输出以下 JSON：',
    '{',
    '  "petMessage": "",',
    '  "travelPlan": {',
    '    "destination": "",',
    '    "theme": "",',
    '    "route": [],',
    '    "reason": ""',
    '  },',
    '  "status": "waiting_departure"',
    '}',
    'JSON 必须可被严格解析，不要包含 Markdown 或代码块。',
  ].join('\n');
  const system = `${systemPrompt}\n\n${outputSchema}`;

  const user = [
    `目的地：${destination.name || ''}${destination.country ? `（${destination.country}）` : ''}`,
    destination.description ? `目的地简介：${destination.description}` : '',
    destination.tags?.length ? `目的地标签：${destination.tags.join('、')}` : '',
    `宠物信息：name=${pet.name || ''} species=${pet.species || ''}`,
    pet.personality ? `宠物性格：${pet.personality}` : '',
    pet.description ? `宠物描述：${pet.description}` : '',
    userPreferences ? `用户偏好：${userPreferences}` : '',
    '任务：给出一段简短的宠物口吻开场，并给出 3-6 个站点的路线（route），适合 Demo 渲染。',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await callDeepSeekJson<TravelStartResponseBody>({
    system,
    user,
    fallback: fallback(destination, pet),
    temperature: 0.6,
  });

  return jsonResponse(200, result.value, {
    'x-ai-provider': 'deepseek',
    'x-ai-used-fallback': result.usedFallback ? '1' : '0',
    ...(result.error ? { 'x-ai-error': result.error.slice(0, 200) } : {}),
  });
};
