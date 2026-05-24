import { useEffect, useMemo, useState } from 'react';
import { friendService } from '../../services/friendService';
import { useAppStore } from '../../store/appStore';
import type { FriendPet, FriendUser } from '../../types';
import { Modal } from '../common/Modal';

export function InvitePetSelectModal() {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const openModal = useAppStore((state) => state.openModal);
  const setSelectedCompanionPet = useAppStore((state) => state.setSelectedCompanionPet);
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<FriendUser>();
  const [selectedPet, setSelectedPet] = useState<FriendPet>();

  useEffect(() => {
    if (activeModal !== 'invitePetSelect') return;
    void friendService.searchUsers(keyword).then(setUsers);
  }, [activeModal, keyword]);

  useEffect(() => {
    if (activeModal !== 'invitePetSelect') return;
    setKeyword('');
    setSelectedUser(undefined);
    setSelectedPet(undefined);
  }, [activeModal]);

  const visiblePets = useMemo(() => selectedUser?.pets ?? [], [selectedUser]);

  const skipInvite = () => {
    setSelectedCompanionPet(undefined);
    openModal('destination');
  };

  const confirmInvite = () => {
    if (!selectedUser || !selectedPet) return;
    setSelectedCompanionPet({
      userId: selectedUser.userId,
      userNickname: selectedUser.nickname,
      petId: selectedPet.petId,
      petName: selectedPet.name,
      petType: selectedPet.type,
      petAvatarUrl: selectedPet.avatarUrl,
    });
    openModal('destination');
  };

  return (
    <Modal title="邀请宠物同行" open={activeModal === 'invitePetSelect'} onClose={closeModal}>
      <div className="modal-body">
        <label className="field">
          <span>搜索用户昵称</span>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入用户昵称" />
        </label>
        <div className="invite-select-grid">
          <section className="invite-column">
            <span className="eyebrow">推荐用户</span>
            <div className="friend-list">
              {users.map((user) => (
                <button
                  className={`friend-card invite-user-card ${selectedUser?.userId === user.userId ? 'selected' : ''}`}
                  type="button"
                  key={user.userId}
                  onClick={() => {
                    setSelectedUser(user);
                    setSelectedPet(undefined);
                  }}
                >
                  <span className="avatar-dot" aria-hidden="true">
                    {user.nickname.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{user.nickname}</strong>
                    <small>{user.bio}</small>
                    <small>{user.pets.length} 只可邀请宠物</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="invite-column">
            <span className="eyebrow">选择宠物</span>
            <div className="friend-list">
              {visiblePets.map((pet) => (
                <button
                  className={`friend-card invite-user-card ${selectedPet?.petId === pet.petId ? 'selected' : ''}`}
                  type="button"
                  key={pet.petId}
                  onClick={() => setSelectedPet(pet)}
                >
                  <img className="invite-pet-avatar" src={pet.avatarUrl || '/assets/home-pet-example.svg'} alt={pet.name} />
                  <span>
                    <strong>{pet.name}</strong>
                    <small>{pet.type}</small>
                    <small>{pet.personalityTags.join('、')}</small>
                  </span>
                </button>
              ))}
              {!selectedUser && <p className="ai-extension-note">请先选择一个用户，再选择该用户的宠物。</p>}
            </div>
          </section>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={skipInvite}>
            跳过邀请
          </button>
          <button className="primary-button" type="button" onClick={confirmInvite} disabled={!selectedUser || !selectedPet}>
            确认邀请
          </button>
        </div>
      </div>
    </Modal>
  );
}
