import { generateArrivingStop, pickLocation, type DestinationInput, type PetInput, type TravelDiaryResponseBody } from './_travelSkill.ts';

type HandlerEvent = { httpMethod: string; body: string | null };
type HandlerResponse = { statusCode: number; headers: Record<string, string>; body: string };

type TravelNextBody = {
  destination?: DestinationInput;
  pet?: PetInput;
  stopIndex?: number;
  route?: string[];
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
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Only POST is supported.' });

  const body = toObject(event.body) as TravelNextBody;
  const destination = body.destination ?? {};
  const pet = body.pet ?? {};
  const stopIndex = Math.max(1, Number(body.stopIndex ?? 1));
  const route = Array.isArray(body.route) ? body.route : [];
  const location = pickLocation(route, stopIndex, destination);

  const { response, result, imageResult } = await generateArrivingStop({ destination, pet, stopIndex, route, location });

  return jsonResponse(200, response satisfies TravelDiaryResponseBody, {
    'x-ai-provider': 'deepseek',
    'x-ai-used-fallback': result.usedFallback ? '1' : '0',
    ...(result.error ? { 'x-ai-error': result.error.slice(0, 200) } : {}),
    ...(imageResult.error ? { 'x-image-error': imageResult.error.slice(0, 200) } : {}),
    'x-image-used-fallback': response.diaryEntry.imageUrl && response.diaryEntry.imageUrl !== destination.coverImageUrl ? '0' : '1',
  });
};
