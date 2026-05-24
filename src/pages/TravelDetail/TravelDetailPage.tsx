import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DiaryList } from '../../components/travel/DiaryList';
import { MessageList } from '../../components/travel/MessageList';
import { useAppStore } from '../../store/appStore';

export function TravelDetailPage() {
  const { travelId } = useParams();
  const record = useAppStore((state) => state.travelHistory.find((travel) => travel.id === travelId));
  const pet = useAppStore((state) => state.pets.find((item) => item.id === record?.petId));
  const [showConversation, setShowConversation] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);

  useEffect(() => {
    if (!showFarewell) return undefined;
    const timer = window.setTimeout(() => setShowFarewell(false), 2600);
    return () => window.clearTimeout(timer);
  }, [showFarewell]);

  const closeConversation = () => {
    setShowConversation(false);
    setShowFarewell(true);
  };

  if (!record) {
    return (
      <section className="panel">
        <h2>没有找到旅行记录</h2>
        <Link to="/">返回首页</Link>
      </section>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-hero">
        <div>
          <h2>{record.destination.name}</h2>
          <p>
            {record.destination.country} · {record.endedAt ? new Date(record.endedAt).toLocaleDateString() : '未完成'} · 第 {record.travelIndex} 次旅行
          </p>
        </div>
      </div>
      <section className="panel detail-story-panel">
        <div className="detail-story-head">
          <div>
            <span className="eyebrow">Travel Journal</span>
            <h2>图文游记</h2>
          </div>
          <div className="tag-row">
            {record.destination.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <p className="detail-description">{record.destination.description}</p>
        <DiaryList entries={record.diaryEntries} />
        <div className="image-strip detail-image-strip">
          {[record.destination.coverImageUrl, ...record.destination.imageUrls].map((url) => (
            <img src={url} alt={record.destination.name} key={url} />
          ))}
        </div>
      </section>
      <section className="panel conversation-entry-panel">
        <div>
          <span className="eyebrow">Memory Chat</span>
          <h2>和你的宠物对话</h2>
          <p>回到这次旅程里的对话现场，左侧保留最初生成的手账日记。</p>
        </div>
        <button className="history-chat-button-inline" type="button" onClick={() => setShowConversation(true)}>
          打开对话
        </button>
      </section>
      <section className="panel detail-feedback-card">
        <h2>Feedback</h2>
        <input placeholder="写一点对这次旅行的反馈" />
        <p>亲密值变化：+{record.intimacyDelta}</p>
      </section>
      {showConversation && (
        <div className="conversation-overlay" role="dialog" aria-modal="true" aria-label="和你的宠物对话">
          <div className="conversation-sheet">
            <div className="conversation-sheet-header">
              <div>
                <span className="eyebrow">Pet Memory</span>
                <h2>和你的宠物对话</h2>
              </div>
              <button type="button" onClick={closeConversation}>
                结束对话
              </button>
            </div>
            <div className="conversation-grid">
              <section className="panel memory-journal-card">
                <span className="eyebrow">First Diary</span>
                <h3>{record.diaryEntries[0]?.title ?? `${record.destination.name} 手账`}</h3>
                <img src={record.diaryEntries[0]?.imageUrl ?? record.destination.coverImageUrl} alt={record.destination.name} />
                <p>{record.diaryEntries[0]?.content ?? record.destination.description}</p>
              </section>
              <section className="panel conversation-chat-card">
                {pet && (
                  <div className="chat-pet-appearance">
                    <img src="/assets/home-pet-example.svg" alt={pet.name} />
                    <span>{pet.name} 出现了</span>
                  </div>
                )}
                <MessageList messages={record.messages} />
              </section>
            </div>
          </div>
        </div>
      )}
      {showFarewell && (
        <div className="pet-farewell" role="status">
          <img src="/assets/home-pet-example.svg" alt="" />
          <span>主人我累了，拜拜</span>
        </div>
      )}
    </div>
  );
}
