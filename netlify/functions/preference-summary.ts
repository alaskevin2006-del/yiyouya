import { callDeepSeekJson, loadSkillPromptBundle } from './_deepseek.ts';

type HandlerEvent = { httpMethod: string; body: string | null };
type HandlerResponse = { statusCode: number; headers: Record<string, string>; body: string };

type PreferenceSummaryBody = {
  text?: string;
};

export type PreferenceSummaryResponseBody = {
  preferenceSummary: string;
  keywords: string[];
  nextRecommendedDestinations: string[];
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

const fallback = (text: string): PreferenceSummaryResponseBody => ({
  preferenceSummary: text.trim() ? `偏好总结：${text.trim()}` : '偏好总结：更喜欢轻松、细节丰富的旅行。',
  keywords: text.trim() ? text.split(/[，。；;\s]+/).filter(Boolean).slice(0, 6) : ['松弛', '自然', '人文'],
  nextRecommendedDestinations: ['京都', '里斯本', '雷克雅未克'],
});

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Only POST is supported.' });

  const body = toObject(event.body) as PreferenceSummaryBody;
  const text = ensureString(body.text).trim();

  const systemPrompt = await loadSkillPromptBundle(['skill']);
  const outputSchema = [
    '你必须输出且只能输出以下 JSON：',
    '{',
    '  "preferenceSummary": "",',
    '  "keywords": [],',
    '  "nextRecommendedDestinations": []',
    '}',
    'JSON 必须可被严格解析，不要包含 Markdown 或代码块。',
  ].join('\n');
  const system = `${systemPrompt}\n\n${outputSchema}`;

  const user = [
    `用户偏好原文：${text}`,
    '任务：把偏好总结成 1-2 句中文（preferenceSummary），提取 3-8 个关键词（keywords），并给出 3-6 个推荐目的地（nextRecommendedDestinations）。',
  ].join('\n');

  const result = await callDeepSeekJson<PreferenceSummaryResponseBody>({
    system,
    user,
    fallback: fallback(text),
    temperature: 0.4,
  });

  return jsonResponse(200, result.value, {
    'x-ai-provider': 'deepseek',
    'x-ai-used-fallback': result.usedFallback ? '1' : '0',
    ...(result.error ? { 'x-ai-error': result.error.slice(0, 200) } : {}),
  });
};
