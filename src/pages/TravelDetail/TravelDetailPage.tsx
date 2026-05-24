import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DiaryList } from '../../components/travel/DiaryList';
import { MessageList } from '../../components/travel/MessageList';
import { useAppStore } from '../../store/appStore';
import type { ChatMessage } from '../../types';

const createUserMessage = (content: string): ChatMessage => ({
  id: `memory-chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role: 'user',
  content,
  createdAt: new Date().toISOString(),
});

const uniqueImageUrls = (urls: Array<string | undefined>) => Array.from(new Set(urls.filter((url): url is string => Boolean(url?.trim()))));

export function TravelDetailPage() {
  const { travelId } = useParams();
  const record = useAppStore((state) => state.travelHistory.find((travel) => travel.id === travelId));
  const pet = useAppStore((state) => state.pets.find((item) => item.id === record?.petId));
  const [showConversation, setShowConversation] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  const [conversationInput, setConversationInput] = useState('');
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [feedbackChoice, setFeedbackChoice] = useState<'like' | 'dislike' | undefined>();
  const memoryPetAvatarUrl = pet?.avatarUrl ?? '/assets/home-pet-example.svg';

  useEffect(() => {
    if (!showFarewell) return undefined;
    const timer = window.setTimeout(() => setShowFarewell(false), 2600);
    return () => window.clearTimeout(timer);
  }, [showFarewell]);

  useEffect(() => {
    setConversationMessages(record?.messages ?? []);
    setConversationInput('');
  }, [record?.id, record?.messages]);

  const closeConversation = () => {
    setShowConversation(false);
    setShowFarewell(true);
  };

  const handleConversationSubmit = (event: FormEvent) => {
    event.preventDefault();
    const content = conversationInput.trim();
    if (!content) return;
    setConversationMessages((messages) => [...messages, createUserMessage(content)]);
    setConversationInput('');
  };

  const handleFeedbackSubmit = (event: FormEvent) => {
    event.preventDefault();
  };

  if (!record) {
    return (
      <section className="panel">
        <h2>没有找到旅行记录</h2>
        <Link to="/">返回首页</Link>
      </section>
    );
  }

  const journalSnapshots = uniqueImageUrls([
    ...record.diaryEntries.map((entry) => entry.imageUrl),
    record.destination.coverImageUrl,
    ...record.destination.imageUrls,
  ]);

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
        <DiaryList entries={record.diaryEntries} showTitle={false} />
        <div className="image-strip detail-image-strip">
          {journalSnapshots.map((url, index) => (
            <img src={url} alt={`${record.destination.name} 手账截图 ${index + 1}`} key={`${url}-${index}`} />
          ))}
        </div>
      </section>
      <section className="panel conversation-entry-panel">
        <div>
          <span className="eyebrow">Memory Chat</span>
          <h2>和你的宠物对话</h2>
          <p>回到这次旅程里的对话现场，左侧保留最初生成的手账日记。</p>
        </div>
        <form className="memory-chat-form" onSubmit={handleConversationSubmit}>
          <input
            value={conversationInput}
            onChange={(event) => setConversationInput(event.target.value)}
            onFocus={() => setShowConversation(true)}
            aria-label="和宠物对话输入"
            placeholder="写一句想对宠物说的话"
          />
          <button className="history-chat-button-inline" type="submit">
            提交
          </button>
        </form>
      </section>
      <form className="panel detail-feedback-card" onSubmit={handleFeedbackSubmit}>
        <h2>Feedback</h2>
        <div className="feedback-choice-row" role="group" aria-label="旅行反馈">
          <button
            className={feedbackChoice === 'like' ? 'selected' : ''}
            type="button"
            onClick={() => setFeedbackChoice('like')}
            aria-pressed={feedbackChoice === 'like'}
          >
            喜欢
          </button>
          <button
            className={feedbackChoice === 'dislike' ? 'selected' : ''}
            type="button"
            onClick={() => setFeedbackChoice('dislike')}
            aria-pressed={feedbackChoice === 'dislike'}
          >
            不喜欢
          </button>
          <button className="primary-button" type="submit" disabled={!feedbackChoice}>
            提交
          </button>
        </div>
        <p>亲密值变化：+{record.intimacyDelta}</p>
      </form>
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
                    <img src={memoryPetAvatarUrl} alt={pet.name} />
                    <span>{pet.name} 出现了</span>
                  </div>
                )}
                <MessageList messages={conversationMessages} />
                <form className="chat-input conversation-chat-input" onSubmit={handleConversationSubmit}>
                  <input
                    value={conversationInput}
                    onChange={(event) => setConversationInput(event.target.value)}
                    aria-label="和宠物对话输入"
                    placeholder="写一句想对宠物说的话"
                  />
                  <button type="submit">发送</button>
                </form>
              </section>
            </div>
          </div>
        </div>
      )}
      {showFarewell && (
        <div className="pet-farewell" role="status">
          <img src={memoryPetAvatarUrl} alt="" />
          <span>主人我累了，拜拜</span>
        </div>
      )}
    </div>
  );
}
