import { useEffect, useState } from 'react';
import type { Pet, UserProfile } from '../../types';

interface PetShowcaseProps {
  user: UserProfile;
  pets: Pet[];
  pet?: Pet;
  onStartJourney: () => void;
  onClaimPet: () => void;
  onEditPreferences: () => void;
  onSelectPet: (pet: Pet) => void;
  onUpdatePet: (petId: string, updates: Partial<Pick<Pet, 'personality' | 'description'>>) => void;
}

export function PetShowcase({ user, pets, pet, onStartJourney, onClaimPet, onEditPreferences, onSelectPet, onUpdatePet }: PetShowcaseProps) {
  const displayPet =
    pet?.id === 'pet-mochi'
      ? {
          ...pet,
          name: '小蓝龙',
          species: '虚拟旅伴龙',
          avatarUrl: '/mock-images/pet-dragon-sway.webp',
        }
      : pet;
  const isAnimatedDragon = displayPet?.avatarUrl.endsWith('.webp') ?? false;
  const activeIndex = Math.max(
    0,
    pets.findIndex((item) => item.id === pet?.id),
  );
  const [editing, setEditing] = useState(false);
  const [personality, setPersonality] = useState(pet?.personality ?? '');
  const [description, setDescription] = useState(pet?.description ?? '');

  useEffect(() => {
    setPersonality(pet?.personality ?? '');
    setDescription(pet?.description ?? '');
    setEditing(false);
  }, [pet?.id, pet?.personality, pet?.description]);

  const switchPet = (direction: -1 | 1) => {
    if (pets.length === 0) return;
    const nextIndex = (activeIndex + direction + pets.length) % pets.length;
    onSelectPet(pets[nextIndex]);
  };

  const handleSave = () => {
    if (!pet) return;
    onUpdatePet(pet.id, { personality, description });
    setEditing(false);
  };

  return (
    <section className={`panel pet-showcase${isAnimatedDragon ? ' dragon-showcase' : ''}`}>
      {/* UI-only hero area: keep all callback props unchanged so the travel flow remains intact. */}
      <div className="pet-showcase-header">
        <span className="eyebrow">AI Companion</span>
        <button className="soft-button" type="button" onClick={onEditPreferences}>
          编辑个人偏好
        </button>
      </div>
      <div className="hero-copy">
        <h2>
          Your Journey,
          <span> Perfected Together</span>
        </h2>
        <p>让宠物替你出发、观察、记录，把远方变成一段可以慢慢翻看的陪伴。</p>
      </div>

      {displayPet ? (
        <>
          <div className="main-pet-stage">
            <button className="pet-arrow" type="button" onClick={() => switchPet(-1)} aria-label="切换到上一个宠物">
              ‹
            </button>
            <div className="main-pet-card">
              <div className={`pet-image-wrap${isAnimatedDragon ? ' animated-pet' : ''}`}>
                <img src={displayPet.avatarUrl} alt={displayPet.name} />
                <span className="intimacy-badge">亲密度 {user.intimacyValue}</span>
              </div>
              {!isAnimatedDragon && (
                <div className="pet-nameplate">
                  <h3>{displayPet.name}</h3>
                  <p>{displayPet.species}</p>
                </div>
              )}
              {!isAnimatedDragon && editing ? (
                <div className="pet-edit-box">
                  <label className="field compact-field">
                    <span>宠物特点</span>
                    <textarea rows={1} value={personality} onChange={(event) => setPersonality(event.target.value)} />
                  </label>
                  <div className="pet-edit-actions">
                    <button type="button" onClick={() => setEditing(false)}>
                      取消
                    </button>
                    <button className="primary-button" type="button" onClick={handleSave}>
                      保存特点
                    </button>
                  </div>
                </div>
              ) : null}
              {!isAnimatedDragon && !editing ? (
                <div className="pet-profile-copy">
                  <div className="pet-trait-row">
                    <p className="speech-bubble">{displayPet.personality}</p>
                    <button className="trait-menu-button" type="button" onClick={() => setEditing(true)} aria-label="编辑宠物特点">
                      <span />
                      <span />
                      <span />
                    </button>
                  </div>
                  <p>认领你的 AI 旅行宠物，让它替你探索世界并带回图文游记。</p>
                </div>
              ) : null}
            </div>
            <button className="pet-arrow" type="button" onClick={() => switchPet(1)} aria-label="切换到下一个宠物">
              ›
            </button>
          </div>

          {isAnimatedDragon && (
            <div className="dragon-copy-layer">
              <div className="pet-nameplate">
                <h3>{displayPet.name}</h3>
                <p>{displayPet.species}</p>
              </div>
              {editing ? (
              <div className="pet-edit-box">
                <label className="field compact-field">
                  <span>宠物特点</span>
                  <textarea rows={1} value={personality} onChange={(event) => setPersonality(event.target.value)} />
                </label>
                <div className="pet-edit-actions">
                  <button type="button" onClick={() => setEditing(false)}>
                    取消
                  </button>
                  <button className="primary-button" type="button" onClick={handleSave}>
                    保存特点
                  </button>
                </div>
              </div>
              ) : (
                <div className="pet-profile-copy">
                  <div className="pet-trait-row">
                    <p className="speech-bubble">{displayPet.personality}</p>
                    <button className="trait-menu-button" type="button" onClick={() => setEditing(true)} aria-label="编辑宠物特点">
                      <span />
                      <span />
                      <span />
                    </button>
                  </div>
                  <p>认领你的 AI 旅行宠物，让它替你探索世界并带回图文游记。</p>
                </div>
              )}
            </div>
            )}
        </>
      ) : (
        <div className="empty-state">
          <h3>还没有认领宠物</h3>
          <p>先认领一个虚拟旅伴，再让它替你出发。</p>
          <button className="primary-button" type="button" onClick={onClaimPet}>
            认领宠物
          </button>
        </div>
      )}

      <div className="pet-actions centered">
        {/* Start Journey keeps the original onStartJourney binding; only the visual shell changed. */}
        <button className="start-button" type="button" onClick={onStartJourney}>
          <span className="start-gem" aria-hidden="true" />
          Start Journey
        </button>
      </div>
      <div className="feature-bar" aria-label="核心能力">
        <div>
          <span>✦</span>
          <strong>AI-Powered</strong>
          <small>替你规划旅行灵感</small>
        </div>
        <div>
          <span>▣</span>
          <strong>Personalized</strong>
          <small>记住你的偏好</small>
        </div>
        <div>
          <span>◎</span>
          <strong>All-in-One</strong>
          <small>对话、路线与游记</small>
        </div>
        <div>
          <span>◇</span>
          <strong>Trusted Companion</strong>
          <small>长期陪伴式记忆</small>
        </div>
      </div>
    </section>
  );
}
