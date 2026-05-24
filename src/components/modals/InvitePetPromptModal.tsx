import { useAppStore } from '../../store/appStore';
import { Modal } from '../common/Modal';

export function InvitePetPromptModal() {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const openModal = useAppStore((state) => state.openModal);
  const setSelectedCompanionPet = useAppStore((state) => state.setSelectedCompanionPet);

  const skipInvite = () => {
    setSelectedCompanionPet(undefined);
    openModal('destination');
  };

  return (
    <Modal title="是否邀请其他宠物同行？" open={activeModal === 'invitePetPrompt'} onClose={closeModal}>
      <div className="modal-body">
        <p className="summary-box">可以邀请好友的宠物一起完成一次共同旅行。</p>
        <div className="modal-actions">
          <button type="button" onClick={skipInvite}>
            暂不邀请
          </button>
          <button className="primary-button" type="button" onClick={() => openModal('invitePetSelect')}>
            邀请宠物
          </button>
        </div>
      </div>
    </Modal>
  );
}
