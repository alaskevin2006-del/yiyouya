import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CommunityHub() {
  // MVP-only visual content: do not connect community APIs here; backend should expose a service first.
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'discover' | 'friends' | 'feedback' | 'following'>('discover');
  const communityItems = [
    {
      author: 'Lena Explorer',
      text: '刚从冰岛回来，带回一张像月光一样冷的瀑布照片。',
      meta: '128 喜欢 · 24 回应',
      place: 'Iceland',
      imageUrl: '/mock-images/reykjavik-cover.jpg',
    },
    {
      author: 'Wanderer Kai',
      text: '今晚的京都雨声很轻，Mochi 说石板路适合慢慢走。',
      meta: '96 喜欢 · 18 回应',
      place: 'Kyoto',
      imageUrl: '/mock-images/kyoto-cover.jpg',
    },
    {
      author: 'Room With Me',
      text: '海边路线已收进手账，下一站想让宠物替我去看落日。',
      meta: '76 喜欢 · 15 回应',
      place: 'Coast',
      imageUrl: '/mock-images/lisbon-cover.jpg',
    },
  ];
  const friendItems = [
    { userId: 'user-nora', name: 'Nora', pet: '云朵猫 Miu', note: '慢节奏城市散步爱好者' },
    { userId: 'user-kai', name: 'Kevin', pet: '背包犬 Toto', note: '喜欢山路、露营和夜景' },
    { userId: 'user-lena', name: 'Saki', pet: '胶片兔 Lumi', note: '美术馆与咖啡馆收藏家' },
  ];

  const openFriendChat = (userId: string) => {
    navigate(`/friends/${userId}/chat`);
  };

  return (
    <section className="panel home-side-panel community-panel">
      <div className="panel-title-row">
        <div>
          <span className="eyebrow">Community Hub</span>
          <h2>社区广场</h2>
        </div>
        <span className="panel-glyph" aria-hidden="true">
          ♧
        </span>
      </div>
      <div className="community-tabs" aria-label="社区动态分类">
        <button className={activeTab === 'discover' ? 'active' : ''} type="button" onClick={() => setActiveTab('discover')}>
          Discovery
        </button>
        <button className={activeTab === 'friends' ? 'active' : ''} type="button" onClick={() => setActiveTab('friends')}>
          Friends
        </button>
        <button className={activeTab === 'feedback' ? 'active' : ''} type="button" onClick={() => setActiveTab('feedback')}>
          Feedback
        </button>
        <button className={activeTab === 'following' ? 'active' : ''} type="button" onClick={() => setActiveTab('following')}>
          Following
        </button>
      </div>
      {activeTab === 'discover' && (
        <div className="community-feed">
          {communityItems.map((item) => (
            <article className="community-item" key={item.author}>
              <span className="avatar-dot" aria-hidden="true">
                {item.author.slice(0, 1)}
              </span>
              <div>
                <h3>{item.author}</h3>
                <p>{item.text}</p>
                <small>{item.meta}</small>
              </div>
              <div className="community-side-media">
                <span className="place-chip">{item.place}</span>
                <img src={item.imageUrl} alt="" />
              </div>
            </article>
          ))}
        </div>
      )}
      {activeTab === 'friends' && (
        <div className="friend-list">
          {friendItems.map((friend) => (
            <article
              className="friend-card"
              key={friend.name}
              role="button"
              tabIndex={0}
              onClick={() => openFriendChat(friend.userId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') openFriendChat(friend.userId);
              }}
            >
              <div>
                <h3>{friend.name}</h3>
                <p>{friend.pet}</p>
                <small>{friend.note}</small>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openFriendChat(friend.userId);
                }}
              >
                对话
              </button>
            </article>
          ))}
        </div>
      )}
      {activeTab === 'feedback' && (
        <form className="feedback-card">
          <label className="field">
            <span>Feedback</span>
            <textarea placeholder="告诉开发者哪里不好用、哪里想增强。" />
          </label>
          <button type="button">提交反馈</button>
        </form>
      )}
      {activeTab === 'following' && <p className="ai-extension-note">Following 接口已保留，后续注册用户接入后展示关注动态。</p>}
    </section>
  );
}
