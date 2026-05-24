import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type DeepSeekChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type CallDeepSeekJsonOptions<T> = {
  system: string;
  user: string;
  fallback: T;
  temperature?: number;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

let envLoaded = false;

const loadLocalEnvOnce = async () => {
  if (envLoaded) return;
  envLoaded = true;

  try {
    const functionDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [path.resolve(process.cwd(), '.env'), path.resolve(functionDir, '..', '..', '.env')];
    let envText = '';
    for (const candidate of candidates) {
      try {
        envText = await readFile(candidate, 'utf-8');
        break;
      } catch {
        // Try the next likely project root.
      }
    }
    if (!envText) return;

    for (const line of envText.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, '$2').trim();
    }
  } catch {
    // Production receives env vars from Netlify; local Vite uses this best-effort .env load.
  }
};

export const getDeepSeekConfig = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = trimTrailingSlash(process.env.DEEPSEEK_BASE_URL?.trim() || 'https://api.deepseek.com');
  const model = process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
  return { apiKey, baseUrl, model };
};

const getChatCompletionsUrl = (baseUrl: string) => {
  const normalized = trimTrailingSlash(baseUrl);
  if (/\/v\d+\/chat\/completions$/i.test(normalized)) return normalized;
  if (/\/v\d+$/i.test(normalized)) return `${normalized}/chat/completions`;
  return `${normalized}/v1/chat/completions`;
};

const timeoutSignal = (ms: number) => AbortSignal.timeout(ms);

const stripJsonCodeFence = (text: string) =>
  text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

const extractFirstJsonObjectText = (text: string) => {
  const cleaned = stripJsonCodeFence(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return undefined;
  return cleaned.slice(start, end + 1);
};

const safeJsonParse = (text: string): unknown => {
  const candidate = extractFirstJsonObjectText(text) ?? text.trim();
  return JSON.parse(candidate);
};

const safeParseOrFallback = <T>(text: string, fallback: T): { value: T; usedFallback: boolean; parseError?: string } => {
  try {
    return { value: safeJsonParse(text) as T, usedFallback: false };
  } catch (error) {
    return {
      value: fallback,
      usedFallback: true,
      parseError: error instanceof Error ? error.message : 'json parse failed',
    };
  }
};

export const callDeepSeekJson = async <T>(options: CallDeepSeekJsonOptions<T>) => {
  await loadLocalEnvOnce();
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) {
    return { value: options.fallback, usedFallback: true, error: 'Missing DEEPSEEK_API_KEY.' };
  }

  const messages: DeepSeekChatMessage[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  try {
    const response = await fetch(getChatCompletionsUrl(baseUrl), {
      method: 'POST',
      signal: timeoutSignal(Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 35000)),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      return { value: options.fallback, usedFallback: true, error: `DeepSeek HTTP ${response.status}: ${rawText.slice(0, 400)}` };
    }

    let content = '';
    try {
      const parsed = JSON.parse(rawText) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: unknown;
      };
      content = parsed.choices?.[0]?.message?.content ?? '';
    } catch {
      content = rawText;
    }

    const parsed = safeParseOrFallback(content, options.fallback);
    return { value: parsed.value, usedFallback: parsed.usedFallback, error: parsed.parseError };
  } catch (error) {
    return {
      value: options.fallback,
      usedFallback: true,
      error: error instanceof Error ? error.message : 'DeepSeek request failed',
    };
  }
};

type SkillPromptMode = 'travel' | 'chat' | 'image' | 'skill';

type PetPromptInput = {
  id?: string;
  name?: string;
  species?: string;
  personality?: string;
  description?: string;
  avatarUrl?: string;
  referenceImageUrl?: string;
};

const readTextFile = async (relativePath: string) => {
  const fullPath = path.resolve(process.cwd(), 'sentient-travel-companion', relativePath);
  return readFile(fullPath, 'utf-8');
};

const readTextFileOptional = async (relativePath: string) => {
  try {
    return await readTextFile(relativePath);
  } catch {
    return '';
  }
};

const defaultSkillPrompt = () =>
  [
    '你是一个虚拟旅行陪伴宠物，必须以宠物人设和用户称呼方式对话与写作。',
    '你必须严格输出 JSON，不要输出任何额外文本、代码块或解释。',
    '如果缺少上下文，请优先给出简洁、可继续推进旅行的回复。',
  ].join('\n');

export const loadSkillPromptBundle = async (modes: SkillPromptMode[]) => {
  const uniqueModes = Array.from(new Set(modes));
  const contents: string[] = [];

  for (const mode of uniqueModes) {
    try {
      if (mode === 'skill') contents.push(await readTextFile('SKILL.md'));
      if (mode === 'travel') contents.push(await readTextFile('references/travel-mode.md'));
      if (mode === 'chat') contents.push(await readTextFile('references/daily-chat.md'));
      if (mode === 'image') contents.push(await readTextFile('references/image-generation.md'));
    } catch {
      contents.push(defaultSkillPrompt());
    }
  }

  return contents.filter(Boolean).join('\n\n');
};

const safeString = (value: unknown) => (typeof value === 'string' ? value : '');

const detectPetType = (pet?: PetPromptInput) => {
  const text = [
    pet?.id,
    pet?.name,
    pet?.species,
    pet?.personality,
    pet?.description,
    pet?.avatarUrl,
    pet?.referenceImageUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/dragon|mochi|龙|龍|蓝龙|藍龍|小蓝龙/.test(text)) return 'dragon';
  if (/cat|猫|貓|lumi|星光/.test(text)) return 'cat';
  if (/duck|鸭|鴨|pico|教授|口袋探险家/.test(text)) return 'duck';
  if (/panda|熊猫|熊貓/.test(text)) return 'panda';
  return '';
};

const petAppearanceDescriptions: Record<string, string> = {
  dragon:
    'A small friendly blue travel dragon companion with a rounded cute body, tiny horns, soft wings, expressive eyes, and a playful swaying posture.',
  cat: 'A refined travel cat companion with an elegant silhouette, alert ears, expressive eyes, and a calm observant posture.',
  duck: 'A professor-like duck travel companion with a thoughtful posture, bright eyes, and a slightly scholarly, gentle presence.',
  panda: 'A warm panda travel companion with a soft rounded body, gentle expression, and loyal, food-loving traveler energy.',
};

export const loadJournalTemplateForPet = async (pet?: PetPromptInput) => {
  const petType = detectPetType(pet);
  if (!petType) return '';
  const template = await readTextFileOptional(`references/journal-templates/${petType}-journal.md`);
  if (!template) return '';
  return [
    `以下是当前宠物类型 ${petType} 的队友手账风格模板。`,
    '在不改变响应 JSON 字段结构的前提下，用它强化 petMessage 和 diaryEntry.text 的语气、观察方式与手账风格。',
    '仍然只输出调用方要求的 JSON，不要输出 Markdown 或额外解释。',
    template,
  ].join('\n');
};

type ImageApiMode = 'openai-chat-image' | 'openai-image-generation' | 'simple-prompt' | 'images';

type ImageApiConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
  mode: ImageApiMode;
};

export type ImageApiResult = {
  imageUrl: string;
  error?: string;
};

const defaultImageUrl = '/mock-images/_mock-visual.svg';
const imageUrlPattern = /https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?|data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/i;

export const getImageApiConfig = async (): Promise<ImageApiConfig | undefined> => {
  await loadLocalEnvOnce();
  const endpoint = process.env.IMAGE_API_ENDPOINT?.trim() || process.env.IMAGE_API_BASE_URL?.trim() || '';
  const apiKey = process.env.IMAGE_API_KEY?.trim() || '';
  const model = process.env.IMAGE_API_MODEL?.trim() || 'gpt-image-2-1024x1024';
  const mode = (process.env.IMAGE_API_MODE?.trim() || 'openai-chat-image') as ImageApiMode;

  if (!endpoint || !apiKey) return undefined;
  if (!['openai-chat-image', 'openai-image-generation', 'simple-prompt', 'images'].includes(mode)) {
    return { endpoint, apiKey, model, mode: 'openai-chat-image' };
  }
  return { endpoint, apiKey, model, mode };
};

export const getDefaultImageUrl = () => defaultImageUrl;

const normalizeBase64Image = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100) return `data:image/png;base64,${trimmed}`;
  return trimmed;
};

const readPath = (value: unknown, pathParts: Array<string | number>): unknown => {
  let current = value;
  for (const part of pathParts) {
    if (typeof part === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
      continue;
    }
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const extractUrlFromContent = (content: unknown) => {
  if (typeof content === 'string') return content.match(imageUrlPattern)?.[0] ?? '';
  if (!Array.isArray(content)) return '';

  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const direct = safeString(record.url) || safeString(record.image_url);
    if (direct) return normalizeBase64Image(direct);
    const nested = readPath(record, ['image_url', 'url']);
    if (safeString(nested)) return normalizeBase64Image(safeString(nested));
    const text = safeString(record.text);
    const fromText = text.match(imageUrlPattern)?.[0] ?? '';
    if (fromText) return fromText;
  }
  return '';
};

const extractImageUrl = (data: Record<string, unknown>) => {
  const directUrl = safeString(data.imageUrl) || safeString(data.image_url) || safeString(data.url);
  if (directUrl) return directUrl;

  const output = safeString(data.output);
  if (output) {
    const outputUrl = output.match(imageUrlPattern)?.[0] ?? normalizeBase64Image(output);
    if (outputUrl) return outputUrl;
  }

  const dataItemUrl = safeString(readPath(data, ['data', 0, 'url']));
  if (dataItemUrl) return dataItemUrl;

  const dataItemBase64 = safeString(readPath(data, ['data', 0, 'b64_json']));
  if (dataItemBase64) return normalizeBase64Image(dataItemBase64);

  const imageItemUrl = safeString(readPath(data, ['images', 0, 'url'])) || safeString(readPath(data, ['images', 0, 'image_url']));
  if (imageItemUrl) return imageItemUrl;

  const images = readPath(data, ['choices', 0, 'message', 'images']);
  if (Array.isArray(images)) {
    for (const image of images) {
      const imageRecord = image && typeof image === 'object' ? (image as Record<string, unknown>) : {};
      const imageDirect = safeString(imageRecord.url) || safeString(imageRecord.image_url);
      if (imageDirect) return normalizeBase64Image(imageDirect);
      const nestedUrl = safeString(readPath(imageRecord, ['image_url', 'url']));
      if (nestedUrl) return nestedUrl;
    }
  }

  return extractUrlFromContent(readPath(data, ['choices', 0, 'message', 'content']));
};

const loadPetReferenceImageDataUrl = async (pet?: PetPromptInput) => {
  const petType = detectPetType(pet);
  if (!petType) return '';
  try {
    const fullPath = path.resolve(process.cwd(), 'sentient-travel-companion', 'assets', 'pet-refs', `${petType}.png`);
    const buffer = await readFile(fullPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
};

const buildImagePrompt = async (imagePrompt: string, pet?: PetPromptInput, includeAppearanceFallback = false) => {
  const template = await readTextFileOptional('references/image-generation.md');
  const petType = detectPetType(pet);
  const appearance = petType ? petAppearanceDescriptions[petType] : '';
  return [
    template
      ? `Apply these teammate image-generation rules while preserving the user's concrete scene request:\n${template}`
      : '',
    'Final image request:',
    imagePrompt,
    includeAppearanceFallback && appearance
      ? `Reference image fallback: if no usable reference image is available to the image model, depict the pet as: ${appearance}`
      : '',
    'Return an image for the final request. Do not return analysis.',
  ]
    .filter(Boolean)
    .join('\n\n');
};

const isQwenImageEditModel = (model: string) => /(^|\/)Qwen-Image-Edit/i.test(model);

const buildImageRequestBody = (config: ImageApiConfig, prompt: string, referenceImage = '') => {
  if (config.mode === 'images') {
    if (isQwenImageEditModel(config.model)) {
      return {
        model: config.model,
        prompt,
        ...(referenceImage ? { image: referenceImage } : {}),
        num_inference_steps: 50,
        cfg: 4,
      };
    }

    return {
      model: config.model,
      prompt,
      image_size: '1024x1024',
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
    };
  }

  if (config.mode === 'openai-image-generation') {
    return {
      model: config.model,
      prompt,
      size: '1024x1024',
    };
  }

  if (config.mode === 'simple-prompt') {
    return {
      prompt,
      model: config.model,
    };
  }

  return {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    modalities: ['image', 'text'],
  };
};

const classifyImageHttpError = (status: number) => {
  if (status === 401 || status === 403) return 'key';
  if (status === 404 || status === 405) return 'endpoint';
  if (status === 400 || status === 422) return 'body-or-model';
  return 'endpoint';
};

const callImageApi = async (config: ImageApiConfig, imagePrompt: string, pet?: PetPromptInput): Promise<ImageApiResult> => {
  try {
    const referenceImage = await loadPetReferenceImageDataUrl(pet);
    const prompt = await buildImagePrompt(imagePrompt, pet, !referenceImage);
    const response = await fetch(config.endpoint, {
      method: 'POST',
      signal: timeoutSignal(Number(process.env.IMAGE_API_TIMEOUT_MS ?? 60000)),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildImageRequestBody(config, prompt, referenceImage)),
    });
    if (!response.ok) return { imageUrl: '', error: classifyImageHttpError(response.status) };

    const data = (await response.json()) as Record<string, unknown>;
    const imageUrl = extractImageUrl(data);
    return imageUrl ? { imageUrl } : { imageUrl: '', error: 'return-parsing' };
  } catch (error) {
    return { imageUrl: '', error: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'endpoint' };
  }
};

export const generateImageUrlResult = async (imagePrompt: string, pet?: PetPromptInput): Promise<ImageApiResult> => {
  const config = await getImageApiConfig();
  if (!config) return { imageUrl: '', error: 'endpoint-or-key' };

  try {
    return await callImageApi(config, imagePrompt, pet);
  } catch {
    return { imageUrl: '', error: 'endpoint' };
  }
};

export const generateImageUrl = async (imagePrompt: string, pet?: PetPromptInput) => {
  const result = await generateImageUrlResult(imagePrompt, pet);
  return result.imageUrl;
};
