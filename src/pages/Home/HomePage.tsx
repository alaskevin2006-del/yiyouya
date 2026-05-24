import { CommunityHub } from '../../components/home/CommunityHub';
import { HistoryList } from '../../components/home/HistoryList';
import { PetShowcase } from '../../components/home/PetShowcase';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { useAppStore } from '../../store/appStore';
import { useCallback, useState } from 'react';

let hasSeenOpeningScene = false;

export function HomePage() {
  const user = useAppStore((state) => state.user);
  const pets = useAppStore((state) => state.pets);
  const activePet = useAppStore((state) => state.activePet);
  const travelHistory = useAppStore((state) => state.travelHistory);
  const currentSession = useAppStore((state) => state.currentSession);
  const openModal = useAppStore((state) => state.openModal);
  const selectPet = useAppStore((state) => state.selectPet);
  const updatePetProfile = useAppStore((state) => state.updatePetProfile);
  const setPreferenceSaveTarget = useAppStore((state) => state.setPreferenceSaveTarget);
  const [showOpeningScene, setShowOpeningScene] = useState(() => !hasSeenOpeningScene);
  const handleOpeningFinish = useCallback(() => {
    hasSeenOpeningScene = true;
    setShowOpeningScene(false);
  }, []);

  const handleStartJourney = () => {
    if (!activePet) {
      openModal('petSelect');
      return;
    }
    if (!user.preferenceSummary) {
      setPreferenceSaveTarget('worldType');
      openModal('preference');
      return;
    }
    openModal('worldType');
  };

  return (
    <>
      {showOpeningScene ? <LoadingScreen onFinish={handleOpeningFinish} /> : null}
      <div className="home-grid" aria-hidden={showOpeningScene}>
        <HistoryList records={travelHistory} currentSession={currentSession} />
        <PetShowcase
          user={user}
          pets={pets}
          pet={activePet}
          onStartJourney={handleStartJourney}
          onClaimPet={() => openModal('petSelect')}
          onEditPreferences={() => {
            setPreferenceSaveTarget('close');
            openModal('preference');
          }}
          onSelectPet={selectPet}
          onUpdatePet={updatePetProfile}
        />
        <CommunityHub />
      </div>
    </>
  );
}
