import { generateExploringReply, type DestinationInput, type PetInput } from './_travelSkill.ts';

type HandlerEvent = { httpMethod: string; body: string | null };
type HandlerResponse = { statusCode: number; headers: Record<string, string>; body: string };

type TravelMessageBody = {
  destination?: DestinationInput;
  pet?: PetInput;
  message?: string;
  currentLocation?: string;
};

export type TravelMessageResponseBody = {
  petMessage: string;
  mood: string;
  suggestedAction: 'continue';
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

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Only POST is supported.' });

  const body = toObject(event.body) as TravelMessageBody;
  const destination = body.destination ?? {};
  const pet = body.pet ?? {};
  const message = ensureString(body.message).trim();
  const currentLocation = ensureString(body.currentLocation);

  const result = await generateExploringReply({ destination, pet, message, currentLocation });
  const response: TravelMessageResponseBody = {
    petMessage: result.value.reply_text,
    mood: 'curious',
    suggestedAction: 'continue',
  };

  return jsonResponse(200, response, {
    'x-ai-provider': 'deepseek',
    'x-ai-used-fallback': result.usedFallback ? '1' : '0',
    ...(result.error ? { 'x-ai-error': result.error.slice(0, 200) } : {}),
  });
};
