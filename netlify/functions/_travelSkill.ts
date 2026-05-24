import { callDeepSeekJson, generateImageUrlResult, loadSkillPromptBundle } from './_deepseek.ts';

export type DestinationInput = {
  name?: string;
  country?: string;
  description?: string;
  tags?: string[];
  coverImageUrl?: string;
};

export type PetInput = {
  id?: string;
  name?: string;
  species?: string;
  personality?: string;
  description?: string;
  avatarUrl?: string;
  referenceImageUrl?: string;
};

export type TravelDiaryResponseBody = {
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

export type SkillArrivingResponse = {
  travel_state: 'arrived';
  current_location: string;
  reply_text: string;
  journal_snippet: string;
  extracted_tags: string[];
  image_prompt_en: string;
  ask_continue: boolean;
};

export type SkillExploringResponse = {
  travel_state: 'exploring';
  current_location: string;
  reply_text: string;
};

export type SkillEndingResponse = {
  travel_state: 'ended';
  reply_text: string;
  trip_summary: string;
  total_locations: number;
};

export const safeString = (value: unknown) => (typeof value === 'string' ? value : '');

export const safeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

export const pickLocation = (route: string[], stopIndex: number, destination: DestinationInput) => {
  const idx = Math.max(1, stopIndex) - 1;
  return route[idx]?.trim() || destination.name || '目的地';
};

const formatCurrentTime = () =>
  new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(new Date());

const getPetTypeHint = (pet: PetInput) =>
  [pet.id, pet.name, pet.species, pet.personality, pet.description].filter(Boolean).join(' / ') || '未指定';

const routeContext = (route: string[], location: string) => {
  const visited = route.slice(0, Math.max(0, route.indexOf(location))).filter(Boolean);
  const upcoming = route.slice(Math.max(0, route.indexOf(location) + 1)).filter(Boolean);
  return { visited, upcoming };
};

const buildExactTravelSystem = async (schema: string) => {
  const systemPrompt = await loadSkillPromptBundle(['travel']);
  return [
    systemPrompt,
    '你必须严格执行上面的渐进式旅行状态机。只输出一个可解析 JSON 对象，不要 Markdown，不要解释。',
    schema,
  ].join('\n\n');
};

const arrivingSchema = [
  '当 travel_state = "arriving" 时，只能输出：',
  '{',
  '  "travel_state": "arrived",',
  '  "current_location": "",',
  '  "reply_text": "",',
  '  "journal_snippet": "",',
  '  "extracted_tags": [],',
  '  "image_prompt_en": "",',
  '  "ask_continue": true',
  '}',
  'journal_snippet 必须是 120-180 字连续文学段落；image_prompt_en 必须包含 the character matching the provided reference image。',
].join('\n');

const exploringSchema = [
  '当 travel_state = "exploring" 时，只能输出：',
  '{',
  '  "travel_state": "exploring",',
  '  "current_location": "",',
  '  "reply_text": ""',
  '}',
  'reply_text 必须是 80-200 字，保持宠物人格，不要生成游记片段或生图提示词。',
].join('\n');

const fallbackArriving = (destination: DestinationInput, pet: PetInput, stopIndex: number, location: string): SkillArrivingResponse => ({
  travel_state: 'arrived',
  current_location: location,
  reply_text: `${pet.name || '宠物'}抵达${location}，第 ${stopIndex} 站开始记录。`,
  journal_snippet: `${location}的光落得很慢，空气里有${destination.tags?.[0] || '旅途'}的气息。我沿着最安静的一段路把细节收好：远处的轮廓、脚边的风、还有想把这一刻带给主人看的念头。`,
  extracted_tags: [location, ...(destination.tags ?? [])].filter(Boolean).slice(0, 3),
  image_prompt_en: `A travel photograph at ${location}. The character matching the provided reference image stands naturally in the scene, surrounded by local atmosphere and soft natural light, photorealistic travel photography, 8K.`,
  ask_continue: true,
});

export const generateArrivingStop = async (options: {
  destination: DestinationInput;
  pet: PetInput;
  stopIndex: number;
  route: string[];
  location: string;
}) => {
  const { destination, pet, stopIndex, route, location } = options;
  const { visited, upcoming } = routeContext(route, location);
  const system = await buildExactTravelSystem(arrivingSchema);
  const user = [
    `{{destination}}=${destination.name || ''}${destination.country ? `（${destination.country}）` : ''}`,
    `{{current_location}}=${location}`,
    `{{visited_locations}}=${visited.join('、') || '无'}`,
    `{{upcoming_locations}}=${upcoming.join('、') || '无'}`,
    `{{api_weather_data}}=本地演示模式，天气未知，请以季节性自然描写轻带过，不要编造具体温度。`,
    `{{travel_case_data}}=${[destination.description, ...(destination.tags ?? [])].filter(Boolean).join('；') || '暂无资料'}`,
    `{{intimacy_level}}=65`,
    `{{current_time}}=${formatCurrentTime()}`,
    `{{pet_type}}=${getPetTypeHint(pet)}`,
    '{{travel_state}}=arriving',
    `这是第 ${stopIndex} 站。请按照 travel-mode.md 的 arriving schema 返回。`,
  ].join('\n');

  const result = await callDeepSeekJson<SkillArrivingResponse>({
    system,
    user,
    fallback: fallbackArriving(destination, pet, stopIndex, location),
    temperature: 0.75,
  });

  const value = result.value;
  const imagePrompt = safeString(value.image_prompt_en);
  const imageResult = imagePrompt ? await generateImageUrlResult(imagePrompt, pet) : { imageUrl: '', error: 'missing-prompt' };
  const imageUrl = imageResult.imageUrl || destination.coverImageUrl?.trim() || '';

  const response: TravelDiaryResponseBody = {
    petMessage: safeString(value.reply_text) || `${pet.name || '宠物'}抵达${location}。`,
    diaryEntry: {
      title: `${location} · 第 ${stopIndex} 站`,
      location: safeString(value.current_location) || location,
      text: safeString(value.journal_snippet) || fallbackArriving(destination, pet, stopIndex, location).journal_snippet,
      mood: 'curious',
      moodDelta: { happiness: 1, healing: 1, curiosity: 2 },
      tags: safeStringArray(value.extracted_tags).length ? safeStringArray(value.extracted_tags) : [location],
      imagePrompt,
      imageUrl,
    },
    nextSuggestion: value.ask_continue === false ? '这趟旅行可以先收束。' : '想继续的话，我可以去下一站。',
  };

  return { response, result, imageResult };
};

export const generateExploringReply = async (options: {
  destination: DestinationInput;
  pet: PetInput;
  message: string;
  currentLocation: string;
}) => {
  const { destination, pet, message, currentLocation } = options;
  const system = await buildExactTravelSystem(exploringSchema);
  const user = [
    `{{destination}}=${destination.name || ''}${destination.country ? `（${destination.country}）` : ''}`,
    `{{current_location}}=${currentLocation || destination.name || '当前景点'}`,
    '{{visited_locations}}=见当前会话记录',
    '{{upcoming_locations}}=见路线安排',
    `{{api_weather_data}}=本地演示模式，天气未知。`,
    `{{travel_case_data}}=${[destination.description, ...(destination.tags ?? [])].filter(Boolean).join('；') || '暂无资料'}`,
    '{{intimacy_level}}=65',
    `{{current_time}}=${formatCurrentTime()}`,
    `{{pet_type}}=${getPetTypeHint(pet)}`,
    '{{travel_state}}=exploring',
    `用户追问：${message}`,
  ].join('\n');

  return callDeepSeekJson<SkillExploringResponse>({
    system,
    user,
    fallback: {
      travel_state: 'exploring',
      current_location: currentLocation || destination.name || '当前景点',
      reply_text: `${pet.name || '宠物'}听见了。我会把这个问题放在眼前的景色里回答给主人：这里最值得记住的，往往不是名气，而是那些慢慢露出来的细节。`,
    },
    temperature: 0.75,
  });
};
