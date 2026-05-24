import { getCozeConfig } from './coze-config';

type CozeAction = 'start' | 'depart' | 'message' | 'next' | 'summarize' | string;

type CozeAgentData = {
  greeting_bubble: string;
  journal_content: string;
  extracted_tags: string[];
  image_prompt: string;
  reply_text: string;
  user_sentiment: string;
  intimacy_bonus: number;
  next_suggestion: string;
  travel_plan: Record<string, unknown> | string[] | string;
  image_url: string | null;
};

type HandlerEvent = {
  httpMethod: string;
  body: string | null;
};

type HandlerResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const emptyData = (): CozeAgentData => ({
  greeting_bubble: '',
  journal_content: '',
  extracted_tags: [],
  image_prompt: '',
  reply_text: '',
  user_sentiment: '',
  intimacy_bonus: 0,
  next_suggestion: '',
  travel_plan: {},
  image_url: null,
});

const jsonResponse = (action: CozeAction, data: CozeAgentData, error: string | null, statusCode = 200): HandlerResponse => ({
  statusCode,
  headers,
  body: JSON.stringify({
    success: !error,
    action,
    data,
    error,
  }),
});

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const toObject = (value: unknown): Record<string, unknown> => {
  const parsed = parseMaybeJson(value);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  if (typeof parsed === 'string') return { content: parsed };
  return {};
};

const collectObjects = (value: unknown, seen = new Set<unknown>()): Record<string, unknown>[] => {
  const parsed = parseMaybeJson(value);
  if (!parsed || seen.has(parsed)) return [];
  seen.add(parsed);

  if (typeof parsed === 'string') return [{ content: parsed }];
  if (Array.isArray(parsed)) return parsed.flatMap((item) => collectObjects(item, seen));
  if (typeof parsed !== 'object') return [];

  const objectValue = parsed as Record<string, unknown>;
  const nestedKeys = ['data', 'output', 'content', 'answer', 'result'];
  return [objectValue, ...nestedKeys.flatMap((key) => collectObjects(objectValue[key], seen))];
};

const firstString = (sources: Record<string, unknown>[], keys: string[]) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = parseMaybeJson(source[key]);
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return '';
};

const firstNumber = (sources: Record<string, unknown>[], keys: string[]) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    }
  }
  return 0;
};

const tagsValue = (sources: Record<string, unknown>[], keys: string[]) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = parseMaybeJson(source[key]);
      if (Array.isArray(value)) {
        const tags = value.map((item) => String(item).trim()).filter(Boolean);
        if (tags.length) return tags;
      }
      if (typeof value === 'string' && value.trim()) {
        const tags = value.split(/[,\r\n]+/).map((item) => item.trim()).filter(Boolean);
        if (tags.length) return tags;
      }
    }
  }
  return [];
};

const valueShape = (value: unknown): string => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return 'array';
  if (parsed === null) return 'null';
  return typeof parsed;
};

const responseShape = (value: unknown) => {
  const sources = collectObjects(value);
  return {
    root: valueShape(value),
    sourceCount: sources.length,
    keys: Array.from(new Set(sources.flatMap((source) => Object.keys(source)))).slice(0, 30),
  };
};

const planValue = (sources: Record<string, unknown>[], keys: string[]): CozeAgentData['travel_plan'] => {
  for (const source of sources) {
    for (const key of keys) {
      const value = parseMaybeJson(source[key]);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
      if (Array.isArray(value)) {
        const plan = value.map((item) => String(item).trim()).filter(Boolean);
        if (plan.length) return plan;
      }
      if (typeof value === 'string' && value.trim()) {
        const plan = value
          .split(/\r?\n/)
          .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
          .filter(Boolean);
        if (plan.length) return plan;
      }
    }
  }
  return {};
};

const normalizeCozeData = (rawPayload: unknown): CozeAgentData => {
  const sources = collectObjects(rawPayload);
  const data = emptyData();

  data.greeting_bubble = firstString(sources, ['greeting_bubble', 'greeting', 'opening', 'bubble']);
  data.journal_content = firstString(sources, ['journal_content', 'journal', 'diary', 'diary_content']);
  data.extracted_tags = tagsValue(sources, ['extracted_tags', 'tags', 'tag_list']);
  data.image_prompt = firstString(sources, ['image_prompt', 'prompt']);
  data.reply_text = firstString(sources, ['reply_text', 'reply', 'message', 'content', 'answer', 'result', 'text']);
  data.user_sentiment = firstString(sources, ['user_sentiment', 'sentiment']);
  data.intimacy_bonus = firstNumber(sources, ['intimacy_bonus', 'intimacy_delta']);
  data.next_suggestion = firstString(sources, ['next_suggestion', 'suggestion', 'next']);
  data.travel_plan = planValue(sources, ['travel_plan', 'plan', 'itinerary']);
  data.image_url = firstString(sources, ['image_url', 'image', 'url']) || null;

  if (!data.greeting_bubble) data.greeting_bubble = data.reply_text;
  if (!data.journal_content) data.journal_content = data.reply_text;
  if (!data.next_suggestion) data.next_suggestion = data.reply_text;
  if (typeof data.travel_plan === 'object' && !Array.isArray(data.travel_plan) && !Object.keys(data.travel_plan).length && data.reply_text) {
    data.travel_plan = { summary: data.reply_text };
  }

  console.warn('[Coze] data keys', Object.keys(data).filter((key) => {
    const value = data[key as keyof CozeAgentData];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }));

  return data;
};

const buildWorkflowParameters = (body: Record<string, unknown>, action: CozeAction) => ({
  action,
  session_id: body.session_id ?? body.sessionId ?? '',
  user_id: body.user_id ?? body.userId ?? '',
  destination: body.destination ?? null,
  current_location: body.current_location ?? body.currentLocation ?? '',
  pet_type: body.pet_type ?? body.petType ?? '',
  pet: body.pet ?? null,
  userPreferences: body.userPreferences ?? body.preferences ?? '',
  historySummary: body.historySummary ?? '',
  user_message: body.user_message ?? body.userMessage ?? body.message ?? '',
  stopIndex: body.stopIndex ?? null,
});

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  let action: CozeAction = 'unknown';
  if (event.httpMethod !== 'POST') {
    return jsonResponse(action, emptyData(), 'Only POST is supported.', 405);
  }

  try {
    const body = toObject(event.body);
    action = firstString([body], ['action']) || 'unknown';

    const { apiToken, workflowId, workflowRunUrl, timeoutMs } = getCozeConfig();
    if (!apiToken) return jsonResponse(action, emptyData(), 'Missing COZE_API_TOKEN.');
    if (!workflowId) return jsonResponse(action, emptyData(), 'Missing COZE_WORKFLOW_ID.');

    console.warn('[Coze] calling function', action);
    console.warn('[Coze] workflow status', 'configured');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let cozeResponse: Response;
    try {
      cozeResponse = await fetch(workflowRunUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          workflow_id: workflowId,
          parameters: buildWorkflowParameters(body, action),
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    console.warn('[Coze] HTTP status', cozeResponse.status);
    const rawText = await cozeResponse.text();
    const rawResult = toObject(rawText);
    console.warn('[Coze] response shape', responseShape(rawResult));
    const cozeCode = rawResult.code;
    const cozeMessage = firstString([rawResult], ['msg', 'message', 'error']);

    if (!cozeResponse.ok) {
      console.warn('[Coze] fallback reason', `http ${cozeResponse.status}`);
      return jsonResponse(action, emptyData(), cozeMessage || `Coze workflow request failed with ${cozeResponse.status}.`);
    }
    if (cozeCode !== undefined && cozeCode !== 0 && cozeCode !== '0') {
      console.warn('[Coze] workflow status', `code ${String(cozeCode)}`);
      console.warn('[Coze] fallback reason', `workflow code ${String(cozeCode)}`);
      return jsonResponse(action, emptyData(), cozeMessage || `Coze workflow returned code ${String(cozeCode)}.`);
    }

    console.warn('[Coze] workflow status', 'success');
    return jsonResponse(action, normalizeCozeData(rawResult.data ?? rawResult), null);
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : error instanceof Error ? error.message : 'Coze agent failed.';
    console.warn('[Coze] fallback reason', reason);
    return jsonResponse(action, emptyData(), reason);
  }
};
