import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import { mockPets } from '../mock/mockPets';
import { mockTravels } from '../mock/mockTravels';
import { mockUser } from '../mock/mockUser';
import { imageService } from './imageService';
import type { Destination, Pet, TravelRecord, UserProfile } from '../types';

interface ViteImportMeta extends ImportMeta {
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

type PreferenceInput = {
  preferenceText?: string;
  preferenceSummary?: string;
  preferenceTags?: string[];
};

type UserRow = {
  id: string;
  auth_user_id?: string | null;
  nickname: string;
  active_pet_id?: string | null;
  preference_summary?: string | null;
  preference_tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

type PetRow = {
  id: string;
  user_id: string;
  name: string;
  type: 'cat' | 'panda' | 'dragon';
  personality?: string | null;
  avatar_url?: string | null;
  reference_image_url?: string | null;
  intimacy?: number | null;
  created_at?: string;
  updated_at?: string;
};

type TravelRecordRow = {
  id: string;
  user_id: string;
  pet_id: string;
  destination_id?: string | null;
  destination_name?: string | null;
  location_text?: string | null;
  weather_text?: string | null;
  travel_index: number;
  status: 'planning' | 'waiting_departure' | 'generating_first_stop' | 'active' | 'pregenerating_next' | 'ended';
  travel_plan?: unknown;
  diary_entries?: TravelRecord['diaryEntries'] | null;
  messages?: TravelRecord['messages'] | null;
  agent_raw_output?: {
    destination?: Destination;
    worldType?: TravelRecord['worldType'];
    feedback?: string;
    [key: string]: unknown;
  } | null;
  image_url?: string | null;
  image_prompt?: string | null;
  extracted_tags?: string[] | null;
  mood?: string | null;
  mood_delta?: number | null;
  intimacy_delta?: number | null;
  feedback_text?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  updated_at?: string;
};

type TravelRecordInsert = Omit<TravelRecordRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

const demoUserId = '00000000-0000-0000-0000-000000000001';
const fallbackDestination = mockTravels[0]?.destination;
const supabaseUrl = (import.meta as ViteImportMeta).env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = (import.meta as ViteImportMeta).env.VITE_SUPABASE_ANON_KEY?.trim();

const supabase: SupabaseClient | undefined =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : undefined;

let userProfile: UserProfile = { ...mockUser, id: demoUserId };
let travelHistory: TravelRecord[] = [...mockTravels];
let remotePets: Pet[] = [];
let customPets: Pet[] = [];
let authUser: SupabaseAuthUser | undefined;

const warnSupabaseFailure = (operation: string, error: unknown) => {
  console.warn(`[dbService] Supabase ${operation} failed; using mock fallback.`, error);
};

const cloneUser = () => ({ ...userProfile });
const clonePets = () => (remotePets.length ? [...customPets, ...remotePets] : [...customPets, ...mockPets]);
const cloneHistory = () => [...travelHistory];
const getCurrentUserId = () => userProfile.id || demoUserId;
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const createUuid = () => crypto.randomUUID();

const petTypeLabels: Record<PetRow['type'], string> = {
  cat: 'cat',
  panda: 'panda',
  dragon: 'dragon',
};

const getPetType = (pet: Pet): PetRow['type'] => {
  const value = `${pet.species} ${pet.name} ${pet.description}`.toLowerCase();
  if (value.includes('panda') || value.includes('熊猫')) return 'panda';
  if (value.includes('dragon') || value.includes('龙')) return 'dragon';
  return 'cat';
};

const getPetDescription = (row: PetRow) => {
  const label = petTypeLabels[row.type];
  return `${row.name} is the current demo ${label} travel companion.`;
};

const toUserProfile = (row: UserRow, pets: PetRow[] = []): UserProfile => {
  const activePet = pets.find((pet) => pet.id === row.active_pet_id);
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? undefined,
    email: authUser?.email,
    nickname: row.nickname ?? mockUser.nickname,
    activePetId: row.active_pet_id ?? undefined,
    preferenceSummary: row.preference_summary ?? undefined,
    intimacyValue: activePet?.intimacy ?? mockUser.intimacyValue,
  };
};

const toUserUpdate = (profile: UserProfile, preferenceTags?: string[]) => ({
  id: getCurrentUserId(),
  auth_user_id: profile.authUserId ?? null,
  nickname: profile.nickname,
  active_pet_id: profile.activePetId && isUuid(profile.activePetId) ? profile.activePetId : null,
  preference_summary: profile.preferenceSummary ?? null,
  preference_tags: preferenceTags ?? [],
});

const toPet = (row: PetRow): Pet => ({
  id: row.id,
  name: row.name,
  species: petTypeLabels[row.type],
  personality: row.personality ?? '',
  avatarUrl: row.avatar_url ?? '',
  referenceImageUrl: row.reference_image_url ?? row.avatar_url ?? '',
  description: getPetDescription(row),
  source: 'future_api',
});

const toPetRow = (pet: Pet, userId = getCurrentUserId()): PetRow => ({
  id: pet.id,
  user_id: userId,
  name: pet.name,
  type: getPetType(pet),
  personality: pet.personality,
  avatar_url: pet.avatarUrl,
  reference_image_url: pet.referenceImageUrl,
  intimacy: userProfile.intimacyValue,
});

const getDestinationFallback = (row: TravelRecordRow): Destination => {
  if (row.agent_raw_output?.destination) {
    const destination = row.agent_raw_output.destination;
    return {
      ...destination,
      coverImageUrl: imageService.getDestinationImage(destination),
      imageUrls: destination.imageUrls?.length ? destination.imageUrls : [imageService.getDestinationImage(destination)],
    };
  }
  return {
    ...fallbackDestination,
    id: row.destination_id ?? fallbackDestination.id,
    name: row.destination_name ?? fallbackDestination.name,
    description: row.location_text ?? fallbackDestination.description,
    coverImageUrl: row.image_url?.trim() || imageService.getDestinationImage(fallbackDestination),
    imageUrls: row.image_url?.trim() ? [row.image_url.trim()] : fallbackDestination.imageUrls,
  };
};

const toTravelRecord = (row: TravelRecordRow): TravelRecord => {
  const destination = getDestinationFallback(row);
  return {
    id: typeof row.agent_raw_output?.frontend_id === 'string' ? row.agent_raw_output.frontend_id : row.id,
    userId: row.user_id,
    petId: row.pet_id,
    destination,
      worldType: row.agent_raw_output?.worldType ?? 'real',
      status: row.status === 'active' ? 'active' : 'completed',
      travelIndex: row.travel_index,
      messages: row.messages ?? [],
      diaryEntries: imageService.normalizeDiaryEntries(row.diary_entries ?? [], destination),
      companionPets: row.agent_raw_output?.companionPets as TravelRecord['companionPets'],
      intimacyDelta: row.intimacy_delta ?? 0,
    createdAt: row.started_at ?? row.created_at,
    endedAt: row.ended_at ?? undefined,
    feedback: row.feedback_text ?? row.agent_raw_output?.feedback,
  };
};

const normalizeTravelRecordImages = (record: TravelRecord): TravelRecord => {
  const destinationImage = imageService.getDestinationImage(record.destination);
  const destination = {
    ...record.destination,
    coverImageUrl: record.destination.coverImageUrl?.trim() || destinationImage,
    imageUrls: record.destination.imageUrls?.length ? record.destination.imageUrls : [destinationImage],
  };
  return {
    ...record,
    destination,
    diaryEntries: imageService.normalizeDiaryEntries(record.diaryEntries, destination),
  };
};

const toTravelRecordRow = (record: TravelRecord): TravelRecordInsert => {
  const normalizedRecord = normalizeTravelRecordImages(record);
  const imageUrl = normalizedRecord.diaryEntries[0]?.imageUrl || imageService.getDestinationImage(normalizedRecord.destination);
  return {
    id: isUuid(normalizedRecord.id) ? normalizedRecord.id : createUuid(),
    user_id: getCurrentUserId(),
    pet_id: normalizedRecord.petId,
    destination_id: null,
    destination_name: normalizedRecord.destination.name,
    location_text: `${normalizedRecord.destination.name}${normalizedRecord.destination.country ? `, ${normalizedRecord.destination.country}` : ''}`,
    weather_text: null,
    travel_index: normalizedRecord.travelIndex,
    status: normalizedRecord.status === 'active' ? 'active' : 'ended',
    travel_plan: {},
    diary_entries: normalizedRecord.diaryEntries,
    messages: normalizedRecord.messages,
    agent_raw_output: {
      frontend_id: normalizedRecord.id,
      destination: normalizedRecord.destination,
      worldType: normalizedRecord.worldType,
      feedback: normalizedRecord.feedback,
      companionPets: normalizedRecord.companionPets,
    },
    image_url: imageUrl,
    image_prompt: null,
    extracted_tags: normalizedRecord.destination.tags,
    mood: null,
    mood_delta: 0,
    intimacy_delta: normalizedRecord.intimacyDelta,
    feedback_text: normalizedRecord.feedback,
    started_at: normalizedRecord.createdAt,
    ended_at: normalizedRecord.endedAt,
    created_at: normalizedRecord.createdAt,
  };
};

const getPreferenceInput = (preferences: PreferenceInput | string, preferenceSummary?: string): PreferenceInput => {
  if (typeof preferences === 'string') {
    return { preferenceText: preferences, preferenceSummary };
  }
  return preferences;
};

const upsertMockTravelRecord = (record: TravelRecord) => {
  const existingIndex = travelHistory.findIndex((travel) => travel.id === record.id);
  if (existingIndex >= 0) {
    travelHistory = travelHistory.map((travel) => (travel.id === record.id ? record : travel));
    return;
  }
  travelHistory = [record, ...travelHistory];
};

const createDefaultPetRows = (userId: string): PetRow[] =>
  mockPets.map((pet) => ({
    ...toPetRow({ ...pet, id: createUuid(), source: 'future_api' }, userId),
    intimacy: mockUser.intimacyValue,
  }));

const ensureProfileForAuthUser = async (user: SupabaseAuthUser): Promise<UserProfile> => {
  if (!supabase) return cloneUser();

  authUser = user;
  const nickname = user.email?.split('@')[0] || mockUser.nickname;
  const { data: existingUser, error: readError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .limit(1)
    .maybeSingle<UserRow>();
  if (readError) throw readError;

  let row = existingUser;
  if (!row) {
    const { data: createdUser, error: createUserError } = await supabase
      .from('users')
      .insert({
        auth_user_id: user.id,
        nickname,
        active_pet_id: null,
        preference_summary: null,
        preference_tags: [],
      })
      .select('*')
      .single<UserRow>();
    if (createUserError) throw createUserError;
    row = createdUser;
  }

  const { data: petData, error: petReadError } = await supabase.from('pets').select('*').eq('user_id', row.id).order('created_at');
  if (petReadError) throw petReadError;

  let pets = (petData as PetRow[] | null) ?? [];
  if (pets.length === 0) {
    const defaultPets = createDefaultPetRows(row.id);
    const { data: createdPets, error: petCreateError } = await supabase.from('pets').insert(defaultPets).select('*').order('created_at');
    if (petCreateError) throw petCreateError;
    pets = (createdPets as PetRow[] | null) ?? defaultPets;
  }

  if (!row.active_pet_id && pets[0]) {
    const { data: updatedUser, error: updateUserError } = await supabase
      .from('users')
      .update({ active_pet_id: pets[0].id })
      .eq('id', row.id)
      .select('*')
      .single<UserRow>();
    if (updateUserError) throw updateUserError;
    row = updatedUser;
  }

  remotePets = pets.map(toPet);
  customPets = [];
  userProfile = toUserProfile(row, pets);
  return cloneUser();
};

const useDemoProfile = () => {
  authUser = undefined;
  userProfile = { ...mockUser, id: demoUserId };
  remotePets = [];
  customPets = [];
};

export const dbService = {
  isSupabaseEnabled(): boolean {
    return Boolean(supabase);
  },

  async getAuthUser() {
    if (!supabase) return undefined;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      authUser = data.user ?? undefined;
      return authUser;
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('session')) {
        authUser = undefined;
        return undefined;
      }
      warnSupabaseFailure('auth lookup', error);
      return undefined;
    }
  },

  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    if (!supabase) return Promise.reject(new Error('Supabase is not configured.'));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Login did not return a user.');
    return ensureProfileForAuthUser(data.user);
  },

  async signUpWithEmail(email: string, password: string): Promise<{ user?: UserProfile; needsConfirmation: boolean }> {
    if (!supabase) return Promise.reject(new Error('Supabase is not configured.'));
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user || !data.session) return { needsConfirmation: true };
    return { user: await ensureProfileForAuthUser(data.user), needsConfirmation: false };
  },

  async signOut(): Promise<UserProfile> {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    useDemoProfile();
    await Promise.all([this.getUserProfile(), this.getPets(), this.getTravelHistory()]);
    return cloneUser();
  },

  onAuthStateChange(callback: () => void) {
    if (!supabase) return () => {};
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authUser = session?.user;
      void callback();
    });
    return () => data.subscription.unsubscribe();
  },

  async getUserProfile(): Promise<UserProfile> {
    if (!supabase) return Promise.resolve(cloneUser());
    try {
      const currentAuthUser = await this.getAuthUser();
      if (currentAuthUser) return ensureProfileForAuthUser(currentAuthUser);

      const [{ data: userData, error: userError }, { data: petData, error: petError }] = await Promise.all([
        supabase.from('users').select('*').eq('id', demoUserId).maybeSingle<UserRow>(),
        supabase.from('pets').select('*').eq('user_id', demoUserId),
      ]);
      if (userError) throw userError;
      if (petError) throw petError;
      if (!userData) return cloneUser();
      userProfile = toUserProfile(userData, (petData as PetRow[] | null) ?? []);
      return cloneUser();
    } catch (error) {
      warnSupabaseFailure('profile read', error);
      return cloneUser();
    }
  },

  async saveSelectedPet(pet: Pet): Promise<UserProfile> {
    userProfile = { ...userProfile, activePetId: pet.id };
    if (!supabase) return Promise.resolve(cloneUser());
    try {
      const { error } = await supabase
        .from('users')
        .update({ active_pet_id: pet.id, updated_at: new Date().toISOString() })
        .eq('id', getCurrentUserId());
      if (error) throw error;
      return cloneUser();
    } catch (error) {
      warnSupabaseFailure('selected pet write', error);
      return cloneUser();
    }
  },

  async updatePet(pet: Pet): Promise<UserProfile> {
    return this.saveSelectedPet(pet);
  },

  async updatePreferences(preferences: PreferenceInput | string, preferenceSummary?: string): Promise<UserProfile> {
    const nextPreferences = getPreferenceInput(preferences, preferenceSummary);
    userProfile = {
      ...userProfile,
      preferenceText: nextPreferences.preferenceText,
      preferenceSummary: nextPreferences.preferenceSummary,
    };
    if (!supabase) return Promise.resolve(cloneUser());
    try {
      const { error } = await supabase.from('users').upsert(toUserUpdate(userProfile, nextPreferences.preferenceTags));
      if (error) throw error;
      return cloneUser();
    } catch (error) {
      warnSupabaseFailure('preferences write', error);
      return cloneUser();
    }
  },

  async createCustomPet(pet: Pet): Promise<Pet> {
    const persistedPet = { ...pet, id: isUuid(pet.id) ? pet.id : createUuid() };
    customPets = [persistedPet, ...customPets.filter((existingPet) => existingPet.id !== persistedPet.id)];
    if (!supabase) return Promise.resolve(persistedPet);
    try {
      const { error } = await supabase.from('pets').upsert(toPetRow(persistedPet));
      if (error) throw error;
      return persistedPet;
    } catch (error) {
      warnSupabaseFailure('custom pet write', error);
      return persistedPet;
    }
  },

  async getPets(): Promise<Pet[]> {
    if (!supabase) return Promise.resolve(clonePets());
    try {
      const { data, error } = await supabase.from('pets').select('*').eq('user_id', getCurrentUserId()).order('created_at');
      if (error) throw error;
      remotePets = ((data as PetRow[] | null) ?? []).map(toPet);
      return clonePets();
    } catch (error) {
      warnSupabaseFailure('pets read', error);
      return clonePets();
    }
  },

  async getTravelHistory(): Promise<TravelRecord[]> {
    if (!supabase) return Promise.resolve(cloneHistory());
    try {
      const { data, error } = await supabase
        .from('travel_records')
        .select('*')
        .eq('user_id', getCurrentUserId())
        .order('created_at', { ascending: false });
      if (error) throw error;
      travelHistory = ((data as TravelRecordRow[] | null) ?? []).map(toTravelRecord);
      return cloneHistory();
    } catch (error) {
      warnSupabaseFailure('travel history read', error);
      return cloneHistory();
    }
  },

  async getTravelRecordById(id: string): Promise<TravelRecord | undefined> {
    if (!supabase) return Promise.resolve(travelHistory.find((travel) => travel.id === id));
    try {
      const { data, error } = await supabase
        .from('travel_records')
        .select('*')
        .eq('id', id)
        .eq('user_id', getCurrentUserId())
        .maybeSingle<TravelRecordRow>();
      if (error) throw error;
      return data ? toTravelRecord(data) : travelHistory.find((travel) => travel.id === id);
    } catch (error) {
      warnSupabaseFailure('travel detail read', error);
      return travelHistory.find((travel) => travel.id === id);
    }
  },

  async getTravelDetail(travelId: string): Promise<TravelRecord | undefined> {
    return this.getTravelRecordById(travelId);
  },

  async saveTravelRecord(record: TravelRecord): Promise<TravelRecord> {
    const normalizedRecord = normalizeTravelRecordImages(record);
    upsertMockTravelRecord(normalizedRecord);
    userProfile = {
      ...userProfile,
      intimacyValue: userProfile.intimacyValue + normalizedRecord.intimacyDelta,
    };
    if (!supabase) return Promise.resolve(normalizedRecord);
    try {
      const { error } = await supabase.from('travel_records').upsert(toTravelRecordRow(normalizedRecord));
      if (error) throw error;
      return normalizedRecord;
    } catch (error) {
      warnSupabaseFailure('travel record write', error);
      return normalizedRecord;
    }
  },

  async createTravelRecord(record: TravelRecord): Promise<TravelRecord> {
    return this.saveTravelRecord(record);
  },

  async updatePetIntimacy(petId: string, delta: number): Promise<UserProfile> {
    userProfile = {
      ...userProfile,
      intimacyValue: userProfile.intimacyValue + delta,
    };
    if (!supabase) return Promise.resolve(cloneUser());
    try {
      const { data, error: readError } = await supabase.from('pets').select('intimacy').eq('id', petId).maybeSingle<{
        intimacy: number | null;
      }>();
      if (readError) throw readError;
      const { error: writeError } = await supabase
        .from('pets')
        .update({ intimacy: (data?.intimacy ?? 0) + delta, updated_at: new Date().toISOString() })
        .eq('id', petId);
      if (writeError) throw writeError;
      return cloneUser();
    } catch (error) {
      warnSupabaseFailure('pet intimacy write', error);
      return cloneUser();
    }
  },

  async getActivePet(): Promise<Pet | undefined> {
    const pets = await this.getPets();
    return pets.find((pet) => pet.id === userProfile.activePetId);
  },
};
