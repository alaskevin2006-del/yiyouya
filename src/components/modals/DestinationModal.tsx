import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockDestinations } from '../../mock/mockDestinations';
import { travelService } from '../../services/travelService';
import { useAppStore } from '../../store/appStore';
import type { Destination, WorldType } from '../../types';
import { Modal } from '../common/Modal';

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const resolvePool = (worldType?: WorldType) => {
  if (worldType === 'real') return mockDestinations.filter((destination) => destination.worldType === 'real');
  if (worldType === 'fantasy') return mockDestinations.filter((destination) => destination.worldType === 'fantasy');
  return mockDestinations;
};

export function DestinationModal() {
  const navigate = useNavigate();
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const user = useAppStore((state) => state.user);
  const pet = useAppStore((state) => state.activePet);
  const selectedWorldType = useAppStore((state) => state.selectedWorldType);
  const selectedDestination = useAppStore((state) => state.selectedDestination);
  const selectedCompanionPet = useAppStore((state) => state.selectedCompanionPet);
  const setSelectedDestination = useAppStore((state) => state.setSelectedDestination);
  const startSession = useAppStore((state) => state.startSession);
  const [customName, setCustomName] = useState('');
  const [recommended, setRecommended] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);

  const worldTypeLabel = useMemo(() => {
    if (selectedWorldType === 'real') return '现实世界';
    if (selectedWorldType === 'fantasy') return '异世界';
    return '随机世界';
  }, [selectedWorldType]);

  useEffect(() => {
    if (activeModal !== 'destination') return;
    const pool = resolvePool(selectedWorldType);
    setRecommended(shuffle(pool).slice(0, 3));
    setSelectedDestination(undefined);
    setCustomName('');
  }, [activeModal, selectedWorldType, setSelectedDestination]);

  const buildCustomDestination = (): Destination | undefined => {
    const name = customName.trim();
    if (!name) return undefined;
    return {
      id: `custom-${Date.now()}`,
      name,
      country: worldTypeLabel,
      description: '用户输入的自定义旅行目的地，后续可接入真实目的地解析服务。',
      tags: ['自定义', worldTypeLabel],
      coverImageUrl: '/mock-images/custom-cover.jpg',
      imageUrls: ['/mock-images/custom-1.jpg', '/mock-images/custom-2.jpg'],
      source: 'custom',
      worldType: selectedWorldType === 'fantasy' ? 'fantasy' : 'real',
    };
  };

  const launchSession = async (destination: Destination, launchWorldType: WorldType) => {
    if (!pet) return;
    setLoading(true);
    const session = await travelService.startTravelSession(user, pet, destination, launchWorldType, selectedCompanionPet ? [selectedCompanionPet] : []);
    startSession(session);
    setLoading(false);
    navigate(`/travel/session/${session.id}`);
  };

  const handleStart = () => {
    const destination = buildCustomDestination() ?? selectedDestination;
    const launchWorldType = selectedWorldType === 'random' ? destination?.worldType : selectedWorldType;
    if (destination && launchWorldType) {
      void launchSession(destination, launchWorldType);
    }
  };

  const handleBlindRandom = () => {
    const pool = resolvePool(selectedWorldType);
    const destination = pool[Math.floor(Math.random() * pool.length)];
    const launchWorldType = selectedWorldType === 'random' ? destination.worldType : selectedWorldType ?? destination.worldType;
    void launchSession(destination, launchWorldType);
  };

  return (
    <Modal title={`选择目的地 · ${worldTypeLabel}`} open={activeModal === 'destination'} onClose={closeModal}>
      <div className="modal-body">
        <label className="field">
          <span>自定义目的地</span>
          <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="输入一个想让宠物前往的地方" />
        </label>
        <div className="destination-grid">
          {recommended.map((destination) => (
            <button
              className={`destination-card ${selectedDestination?.id === destination.id ? 'selected' : ''}`}
              type="button"
              key={destination.id}
              onClick={() => setSelectedDestination(destination)}
            >
              <strong>{destination.name}</strong>
              <span>{destination.country}</span>
              <small>{destination.description}</small>
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={handleBlindRandom} disabled={loading}>
            盲盒随机出发
          </button>
          <button className="primary-button" type="button" onClick={handleStart} disabled={loading || (!customName.trim() && !selectedDestination)}>
            {loading ? '准备中...' : '按当前选择出发'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
