import { useEffect, useMemo, useState } from 'react';
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

const fallbackPets: Pet[] = [];

export function PetShowcase({ user, pets, pet, onStartJourney, onClaimPet, onEditPreferences, onSelectPet }: PetShowcaseProps) {
  const showcasePets = pets.length > 0 ? pets : fallbackPets;
  const defaultPet = useMemo(() => pet ?? showcasePets.find((item) => item.id === 'cat') ?? showcasePets[0], [pet, showcasePets]);
  const [displayPetId, setDisplayPetId] = useState(defaultPet?.id);

  useEffect(() => {
    setDisplayPetId(defaultPet?.id);
  }, [defaultPet?.id]);

  const activeIndex = Math.max(
    0,
    showcasePets.findIndex((item) => item.id === displayPetId),
  );
  const displayPet = showcasePets[activeIndex];
  const selectedPetId = pet?.id;
  const isSelected = Boolean(displayPet && displayPet.id === selectedPetId);
  const theme = displayPet?.theme ?? 'ivory';
  const animationStyle = displayPet?.animationStyle ?? 'elegant-float';
  const tags = displayPet?.tags?.slice(0, 5) ?? displayPet?.personality.split('、').slice(0, 5) ?? [];
  const showcaseAvatarUrl = displayPet?.avatarUrl;

  const switchPet = (direction: -1 | 1) => {
    if (showcasePets.length === 0) return;
    const nextIndex = (activeIndex + direction + showcasePets.length) % showcasePets.length;
    setDisplayPetId(showcasePets[nextIndex].id);
  };

  const selectDisplayPet = () => {
    if (!displayPet) return;
    onSelectPet(displayPet);
  };

  return (
    <section className={`panel pet-showcase pet-showcase-${theme}`}>
      <div className="pet-showcase-header">
        <span className="eyebrow">Choose Your Travel Companion</span>
        <button className="soft-button" type="button" onClick={onEditPreferences}>
          编辑个人偏好
        </button>
      </div>

      <div className="hero-copy pet-carousel-copy">
        <h2>选择替你看世界的伙伴</h2>
        <p>它会带着自己的性格，替你出发、记录、想念你。</p>
      </div>

      {displayPet ? (
        <>
          <div className="main-pet-stage pet-carousel-stage">
            <button className="pet-arrow" type="button" onClick={() => switchPet(-1)} aria-label="切换到上一个宠物">
              ‹
            </button>

            <article className={`main-pet-card pet-carousel-card ${isSelected ? 'selected' : ''}`}>
              <div className={`pet-image-wrap pet-avatar-stage ${animationStyle}`}>
                <span className="pet-glow" aria-hidden="true" />
                <img src={showcaseAvatarUrl} alt={displayPet.displayName ?? displayPet.name} />
                <span className="intimacy-badge">亲密度 {user.intimacyValue}</span>
              </div>

              <div className="pet-copy-panel">
                <div className="pet-nameplate">
                  <span className="pet-type-label">{displayPet.type?.toUpperCase() ?? displayPet.species}</span>
                  <h3>{displayPet.displayName ?? displayPet.name}</h3>
                  <p>它会叫你：{displayPet.callUser ?? user.nickname}</p>
                </div>

                <div className="pet-tags" aria-label="性格标签">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="pet-profile-copy">
                  <p className="speech-bubble">{displayPet.shortIntro ?? displayPet.description}</p>
                  <p className="journal-style">游记风格：{displayPet.journalStyle ?? displayPet.personality}</p>
                </div>
              </div>
            </article>

            <button className="pet-arrow" type="button" onClick={() => switchPet(1)} aria-label="切换到下一个宠物">
              ›
            </button>
          </div>

          <div className="pet-indicators" aria-label="宠物切换">
            {showcasePets.map((item) => (
              <button
                key={item.id}
                className={item.id === displayPet.id ? 'active' : ''}
                type="button"
                onClick={() => setDisplayPetId(item.id)}
                aria-label={`切换到${item.displayName ?? item.name}`}
                aria-pressed={item.id === displayPet.id}
              />
            ))}
          </div>

          <div className="pet-actions centered">
            <button className="primary-button pet-select-button" type="button" onClick={selectDisplayPet} disabled={isSelected}>
              {isSelected ? '当前伙伴' : '选择这只宠物'}
            </button>
            <button className="start-button" type="button" onClick={onStartJourney}>
              <span className="start-gem" aria-hidden="true" />
              Start Journey
            </button>
          </div>
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
