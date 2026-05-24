import { create } from 'zustand';
import { mockPets } from '../mock/mockPets';
import { mockTravels } from '../mock/mockTravels';
import { mockUser } from '../mock/mockUser';
import { dbService } from '../services/dbService';
import type {
  ChatMessage,
  CompanionPet,
  Destination,
  DiaryEntry,
  ModalType,
  Pet,
  TravelRecord,
  TravelSession,
  TravelSessionStatus,
  UserProfile,
  WorldType,
} from '../types';

interface AppState {
  user: UserProfile;
  pets: Pet[];
  activePet?: Pet;
  preferenceSummary: string;
  travelHistory: TravelRecord[];
  currentSession?: TravelSession;
  latestEndedRecord?: TravelRecord;
  isAuthenticated: boolean;
  authEmail?: string;
  activeModal: ModalType;
  preferenceSaveTarget: 'worldType' | 'close';
  selectedWorldType?: WorldType;
  selectedDestination?: Destination;
  selectedCompanionPet?: CompanionPet;
  refreshRemoteState: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  selectPet: (pet: Pet) => void;
  addCustomPet: (pet: Pet) => Promise<void>;
  updatePetProfile: (petId: string, updates: Partial<Pick<Pet, 'personality' | 'description'>>) => void;
  updatePreferences: (preferenceText: string, preferenceSummary: string) => void;
  openModal: (modal: Exclude<ModalType, null>) => void;
  closeModal: () => void;
  setPreferenceSaveTarget: (target: 'worldType' | 'close') => void;
  setSelectedWorldType: (worldType: WorldType) => void;
  setSelectedDestination: (destination?: Destination) => void;
  setSelectedCompanionPet: (companionPet?: CompanionPet) => void;
  startSession: (session: TravelSession) => void;
  setSessionStatus: (status: TravelSessionStatus) => void;
  setTravelPlan: (travelPlan: string[]) => void;
  addMessage: (message: ChatMessage) => void;
  addDiaryEntry: (entry: DiaryEntry) => void;
  endSession: () => void;
  addTravelRecord: (record: TravelRecord) => void;
  showTravelSummary: (record: TravelRecord) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: { ...mockUser },
  pets: [...mockPets],
  activePet: mockPets.find((pet) => pet.id === mockUser.activePetId),
  preferenceSummary: mockUser.preferenceSummary ?? '',
  travelHistory: [...mockTravels],
  currentSession: undefined,
  latestEndedRecord: undefined,
  isAuthenticated: false,
  authEmail: undefined,
  activeModal: null,
  preferenceSaveTarget: 'worldType',
  selectedWorldType: undefined,
  selectedDestination: undefined,
  selectedCompanionPet: undefined,

  refreshRemoteState: async () => {
    const [user, pets, travelHistory] = await Promise.all([dbService.getUserProfile(), dbService.getPets(), dbService.getTravelHistory()]);
    useAppStore.setState({
      user,
      pets,
      activePet: pets.find((pet) => pet.id === user.activePetId) ?? pets[0],
      preferenceSummary: user.preferenceSummary ?? '',
      travelHistory,
      isAuthenticated: Boolean(user.authUserId),
      authEmail: user.email,
    });
  },

  signInWithEmail: async (email, password) => {
    await dbService.signInWithEmail(email, password);
    await get().refreshRemoteState();
  },

  signUpWithEmail: async (email, password) => {
    const result = await dbService.signUpWithEmail(email, password);
    if (result.user) await get().refreshRemoteState();
    return result.needsConfirmation;
  },

  signOut: async () => {
    await dbService.signOut();
    await get().refreshRemoteState();
  },

  selectPet: (pet) =>
    set((state) => {
      void dbService.saveSelectedPet(pet);
      return {
        activePet: pet,
        user: { ...state.user, activePetId: pet.id },
      };
    }),

  addCustomPet: async (pet) => {
    const savedPet = await dbService.createCustomPet(pet);
    await dbService.saveSelectedPet(savedPet);
    set((state) => ({
      pets: [savedPet, ...state.pets.filter((existingPet) => existingPet.id !== savedPet.id)],
      activePet: savedPet,
      user: { ...state.user, activePetId: savedPet.id },
    }));
  },

  updatePetProfile: (petId, updates) =>
    set((state) => {
      const pets = state.pets.map((pet) => (pet.id === petId ? { ...pet, ...updates } : pet));
      return {
        pets,
        activePet: state.activePet?.id === petId ? { ...state.activePet, ...updates } : state.activePet,
      };
    }),

  updatePreferences: (preferenceText, preferenceSummary) =>
    set((state) => {
      void dbService.updatePreferences({ preferenceText, preferenceSummary });
      return {
        preferenceSummary,
        user: { ...state.user, preferenceText, preferenceSummary },
      };
    }),

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setPreferenceSaveTarget: (target) => set({ preferenceSaveTarget: target }),
  setSelectedWorldType: (worldType) => set({ selectedWorldType: worldType, selectedDestination: undefined }),
  setSelectedDestination: (destination) => set({ selectedDestination: destination }),
  setSelectedCompanionPet: (companionPet) => set({ selectedCompanionPet: companionPet }),

  startSession: (session) =>
    set({
      currentSession: session,
      activeModal: null,
      selectedDestination: session.destination,
      selectedWorldType: session.worldType,
      selectedCompanionPet: undefined,
    }),

  setSessionStatus: (status) =>
    set((state) => ({
      currentSession: state.currentSession ? { ...state.currentSession, status } : undefined,
    })),

  setTravelPlan: (travelPlan) =>
    set((state) => ({
      currentSession: state.currentSession ? { ...state.currentSession, travelPlan } : undefined,
    })),

  addMessage: (message) =>
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, messages: [...state.currentSession.messages, message] }
        : undefined,
    })),

  addDiaryEntry: (entry) =>
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, diaryEntries: [...state.currentSession.diaryEntries, entry] }
        : undefined,
    })),

  endSession: () => set({ currentSession: undefined, selectedDestination: undefined, selectedCompanionPet: undefined }),

  addTravelRecord: (record) => {
    const travelIndex = get().travelHistory.length + 1;
    const normalizedRecord = { ...record, travelIndex };
    void dbService.saveTravelRecord(normalizedRecord);
    set((state) => ({
      travelHistory: [normalizedRecord, ...state.travelHistory],
      user: { ...state.user, intimacyValue: state.user.intimacyValue + normalizedRecord.intimacyDelta },
    }));
  },

  showTravelSummary: (record) => set({ latestEndedRecord: record, activeModal: 'travelSummary' }),
}));

void useAppStore.getState().refreshRemoteState();
dbService.onAuthStateChange(() => {
  void useAppStore.getState().refreshRemoteState();
});
