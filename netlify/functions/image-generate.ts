import { generateImageUrlResult, getDefaultImageUrl, getImageApiConfig } from './_deepseek.ts';

type HandlerEvent = {
  httpMethod: string;
  body: string | null;
};

type HandlerResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type ImageGenerateBody = {
  prompt?: string;
};

type ImageGenerateResponseBody = {
  imageUrl: string;
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

const safeString = (value: unknown) => (typeof value === 'string' ? value : '');

const fallback = (): ImageGenerateResponseBody => ({ imageUrl: getDefaultImageUrl() });

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Only POST is supported.' });

  const config = await getImageApiConfig();
  if (!config) {
    return jsonResponse(200, fallback(), {
      'x-image-provider': 'external',
      'x-image-used-fallback': '1',
      'x-image-error': 'Missing IMAGE_API_ENDPOINT or IMAGE_API_KEY.',
    });
  }

  const body = toObject(event.body) as ImageGenerateBody;
  const prompt = safeString(body.prompt).trim();
  if (!prompt) {
    return jsonResponse(200, fallback(), {
      'x-image-provider': 'external',
      'x-image-used-fallback': '1',
      'x-image-error': 'Missing prompt.',
    });
  }

  try {
    const result = await generateImageUrlResult(prompt);
    const usedFallback = !result.imageUrl;
    return jsonResponse(200, usedFallback ? fallback() : { imageUrl: result.imageUrl }, {
      'x-image-provider': 'external',
      'x-image-mode': config.mode,
      'x-image-used-fallback': usedFallback ? '1' : '0',
      ...(usedFallback ? { 'x-image-error': result.error ?? 'return-parsing' } : {}),
    });
  } catch (error) {
    return jsonResponse(200, fallback(), {
      'x-image-provider': 'external',
      'x-image-used-fallback': '1',
      'x-image-error': error instanceof Error ? error.message.slice(0, 120) : 'request failed',
    });
  }
};
