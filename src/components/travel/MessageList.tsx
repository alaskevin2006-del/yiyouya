import type { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  showRegenerate?: boolean;
}

export function MessageList({ messages, showRegenerate = false }: MessageListProps) {
  return (
    <section className="chat-panel">
      <div className="message-list">
        {messages.map((message) => (
          <div className={`message ${message.role}`} key={message.id}>
            <div className="message-content">
              <strong>{message.role === 'user' ? '你' : message.role === 'pet' ? '宠物' : '系统'}</strong>
              <p>{message.content}</p>
              {message.imageUrl && <img className="message-image" src={message.imageUrl} alt="旅行生成图" />}
            </div>
            {showRegenerate && message.role === 'pet' && (
              <button className="regenerate-button" type="button" disabled>
                重新生成
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
