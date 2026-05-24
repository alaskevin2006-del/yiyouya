import { useAppStore } from '../../store/appStore';
import type { WorldType } from '../../types';
import { Modal } from '../common/Modal';

const worldOptions: Array<{ type: WorldType; title: string; description: string }> = [
  { type: 'real', title: '现实世界', description: '让宠物根据性格，在真实城市、自然风景与日常街区里挑选适合自己的旅行世界。' },
  { type: 'fantasy', title: '幻想世界', description: '如果宠物更爱冒险和想象，就让它进入地图之外的奇遇世界。' },
  { type: 'random', title: '宠物盲选', description: '不提前揭晓类型，由宠物按当下心情和偏好决定出发的世界。' },
];

export function WorldTypeModal() {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const openModal = useAppStore((state) => state.openModal);
  const selectedWorldType = useAppStore((state) => state.selectedWorldType);
  const setSelectedWorldType = useAppStore((state) => state.setSelectedWorldType);

  const handleNext = () => {
    if (selectedWorldType) {
      openModal('invitePetPrompt');
    }
  };

  return (
    <Modal title="宠物选择世界" open={activeModal === 'worldType'} onClose={closeModal}>
      <div className="modal-body">
        <div className="world-choice-intro">
          <span className="eyebrow">Pet World Match</span>
          <p>让宠物依据自己的性格、兴趣和你的偏好记忆，选择最适合它所属的旅行世界。</p>
        </div>
        <div className="world-type-grid">
          {worldOptions.map((option) => (
            <button
              className={`world-type-card ${selectedWorldType === option.type ? 'selected' : ''}`}
              type="button"
              key={option.type}
              onClick={() => setSelectedWorldType(option.type)}
            >
              <span className="world-card-kicker">宠物会选择</span>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={handleNext} disabled={!selectedWorldType}>
          继续查看宠物目的地
        </button>
      </div>
    </Modal>
  );
}
