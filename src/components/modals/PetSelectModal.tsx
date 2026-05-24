import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Pet } from '../../types';
import { Modal } from '../common/Modal';

const createCustomPet = (name: string): Pet => ({
  id: `pet-custom-${Date.now()}`,
  name,
  species: '自定义旅行宠物',
  personality: '由主人定义，后续可接入真实宠物生成服务。',
  avatarUrl: '/mock-images/pet-custom.png',
  referenceImageUrl: '/mock-images/pet-custom-reference.jpg',
  description: '这是一个本地 mock 的自定义宠物，真实创建接口已在 dbService 中预留。',
  source: 'custom',
});

export function PetSelectModal() {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const selectPet = useAppStore((state) => state.selectPet);
  const addCustomPet = useAppStore((state) => state.addCustomPet);
  const openModal = useAppStore((state) => state.openModal);
  const setPreferenceSaveTarget = useAppStore((state) => state.setPreferenceSaveTarget);
  const pets = useAppStore((state) => state.pets);
  const activePet = useAppStore((state) => state.activePet);
  const hasPreferences = useAppStore((state) => Boolean(state.user.preferenceSummary));
  const [index, setIndex] = useState(0);
  const [customName, setCustomName] = useState('');

  const pet = pets[index] ?? pets[0];
  const tags = pet?.tags?.slice(0, 5) ?? pet?.personality.split('、').slice(0, 5) ?? [];

  const goNext = () => {
    if (pets.length === 0) return;
    setIndex((current) => (current + 1) % pets.length);
  };
  const goPrev = () => {
    if (pets.length === 0) return;
    setIndex((current) => (current - 1 + pets.length) % pets.length);
  };

  const continueFlow = () => {
    setPreferenceSaveTarget('worldType');
    openModal(hasPreferences ? 'worldType' : 'preference');
  };

  const handleConfirm = () => {
    if (!pet) return;
    selectPet(pet);
    continueFlow();
  };

  const handleCreateCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    const customPet = createCustomPet(name);
    await addCustomPet(customPet);
    setCustomName('');
    continueFlow();
  };

  return (
    <Modal title="选择你的旅行宠物" open={activeModal === 'petSelect'} onClose={closeModal}>
      <div className="modal-body">
        {pet ? (
          <div className="pet-carousel modal-pet-carousel">
            <button type="button" onClick={goPrev} aria-label="上一个宠物">
              ‹
            </button>
            <div className={`pet-option theme-${pet.theme ?? 'ivory'}${activePet?.id === pet.id ? ' selected' : ''}`}>
              <img src={pet.referenceImageUrl || pet.avatarUrl} alt={`${pet.name} reference`} />
              <div>
                <span className="pet-type-label">{pet.type?.toUpperCase() ?? pet.species}</span>
                <h3>{pet.displayName ?? pet.name}</h3>
                <p className="modal-pet-intro">{pet.shortIntro ?? pet.description}</p>
                <div className="pet-tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p className="journal-style">游记风格：{pet.journalStyle ?? pet.personality}</p>
              </div>
            </div>
            <button type="button" onClick={goNext} aria-label="下一个宠物">
              ›
            </button>
          </div>
        ) : (
          <div className="empty-state compact">
            <h3>暂无可选宠物</h3>
            <p>可以先创建一个自定义宠物。</p>
          </div>
        )}

        <div className="modal-pet-dots" aria-label="宠物选项">
          {pets.map((item, petIndex) => (
            <button
              key={item.id}
              className={petIndex === index ? 'active' : ''}
              type="button"
              onClick={() => setIndex(petIndex)}
              aria-label={`选择预览${item.displayName ?? item.name}`}
              aria-pressed={petIndex === index}
            />
          ))}
        </div>

        <button className="primary-button" type="button" onClick={handleConfirm} disabled={!pet}>
          {activePet?.id === pet?.id ? '继续使用当前伙伴' : '确认选择'}
        </button>
        <div className="custom-pet-box">
          <label className="field">
            <span>自定义宠物名称</span>
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="给你的宠物起一个名字" />
          </label>
          <button type="button" onClick={handleCreateCustom} disabled={!customName.trim()}>
            创建并选择自定义宠物
          </button>
        </div>
      </div>
    </Modal>
  );
}
