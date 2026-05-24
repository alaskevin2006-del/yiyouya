import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageList } from '../../components/travel/MessageList';
import { agentService } from '../../services/agentService';
import { travelService } from '../../services/travelService';
import { useAppStore } from '../../store/appStore';
import type { ChatMessage } from '../../types';

const createUserMessage = (content: string): ChatMessage => ({
  id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role: 'user',
  content,
  createdAt: new Date().toISOString(),
});

const createPetMessage = (content: string, imageUrl?: string): ChatMessage => ({
  id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role: 'pet',
  content,
  imageUrl,
  createdAt: new Date().toISOString(),
});

export function TravelSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const session = useAppStore((state) => state.currentSession);
  const user = useAppStore((state) => state.user);
  const activePet = useAppStore((state) => state.activePet);
  const addMessage = useAppStore((state) => state.addMessage);
  const addDiaryEntry = useAppStore((state) => state.addDiaryEntry);
  const normalizeCurrentSessionImages = useAppStore((state) => state.normalizeCurrentSessionImages);
  const setSessionStatus = useAppStore((state) => state.setSessionStatus);
  const addTravelRecord = useAppStore((state) => state.addTravelRecord);
  const showTravelSummary = useAppStore((state) => state.showTravelSummary);
  const endSession = useAppStore((state) => state.endSession);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || session.id !== sessionId || session.status !== 'planning') return;
    const timer = window.setTimeout(() => {
      setSessionStatus('waiting_departure');
      addMessage(createPetMessage('主人，行程已经准备好。等你一句“我要出发”，我就动身。'));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [addMessage, session, sessionId, setSessionStatus]);

  useEffect(() => {
    normalizeCurrentSessionImages();
  }, [normalizeCurrentSessionImages, session?.id, session?.messages.length]);

  if (!session || session.id !== sessionId) {
    return (
      <section className="panel">
        <h2>没有找到当前旅行</h2>
        <p>如果是未完成旅行，请从首页历史足迹继续进入。</p>
      </section>
    );
  }

  const generateStop = async (isFirstStop: boolean) => {
    setBusy(true);
    setSessionStatus(isFirstStop ? 'generating_first_stop' : 'pregenerating_next');
    const latestSession = useAppStore.getState().currentSession ?? session;
    const entry = await agentService.generateDiaryEntry(latestSession.destination, latestSession.diaryEntries.length + 1);
    addDiaryEntry(entry);
    addMessage(createPetMessage(`${entry.title}：${entry.content}`, entry.imageUrl));
    setSessionStatus('active');
    setBusy(false);
  };

  const handleDepart = async () => {
    const latestSession = useAppStore.getState().currentSession ?? session;
    if (!['waiting_departure', 'active'].includes(latestSession.status)) return;
    setBusy(true);
    const departed = await travelService.departTravelSession(latestSession);
    departed.messages.slice(latestSession.messages.length).forEach(addMessage);
    setSessionStatus(departed.status);
    setBusy(false);
    await generateStop(true);
  };

  const handleNext = async () => {
    const latestSession = useAppStore.getState().currentSession ?? session;
    if (latestSession.status !== 'active') return;
    setBusy(true);
    const nextSession = await travelService.goToNextDestination(latestSession);
    nextSession.messages.slice(latestSession.messages.length).forEach(addMessage);
    setBusy(false);
    await generateStop(false);
  };

  const ensureDiaryBeforeEnd = async () => {
    const latestSession = useAppStore.getState().currentSession ?? session;
    if (latestSession.diaryEntries.length > 0) return latestSession;
    const entry = await agentService.generateDiaryEntry(latestSession.destination, 1);
    addDiaryEntry(entry);
    addMessage(createPetMessage(`${entry.title}：${entry.content}`, entry.imageUrl));
    return useAppStore.getState().currentSession ?? latestSession;
  };

  const handleEnd = async () => {
    setBusy(true);
    setSessionStatus('ended');
    const sessionWithDiary = await ensureDiaryBeforeEnd();
    const record = await travelService.endTravelSession({ ...sessionWithDiary, status: 'ended' }, user);
    addTravelRecord(record);
    endSession();
    setBusy(false);
    navigate('/');
    window.setTimeout(() => showTravelSummary({ ...record, travelIndex: useAppStore.getState().travelHistory[0]?.travelIndex ?? record.travelIndex }), 0);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setInput('');
    addMessage(createUserMessage(content));
    if (['出发', '我要出发'].includes(content)) {
      await handleDepart();
      return;
    }
    if (['下一个目的地', '去下一个目的地'].includes(content)) {
      await handleNext();
      return;
    }
    if (['结束旅行', '结束'].includes(content)) {
      await handleEnd();
      return;
    }
    setBusy(true);
    const latestSession = useAppStore.getState().currentSession ?? session;
    const reply = await travelService.sendTravelMessage(latestSession, content);
    addMessage(reply);
    setBusy(false);
  };

  return (
    <div className="session-page chat-session-page">
      <div className="session-toolbar">
        <div>
          <h2>{activePet?.name ?? '宠物'}正在旅行：{session.destination.name}</h2>
          <p>{session.worldType === 'fantasy' ? '异世界' : '现实世界'} · 当前状态：{session.status}</p>
        </div>
        <button className="session-end-button" type="button" onClick={handleEnd} disabled={busy || session.status === 'ended'}>
          结束旅行
        </button>
      </div>

      <div className="chat-shell">
        <MessageList messages={session.messages} showRegenerate />
        <div className="action-row chat-trigger-row">
          <button type="button" onClick={handleDepart} disabled={busy || !['waiting_departure', 'active'].includes(session.status)}>
            我要出发
          </button>
          <button type="button" onClick={handleNext} disabled={busy || session.status !== 'active'}>
            下一个目的地
          </button>
        </div>
        <form className="chat-input" onSubmit={handleSubmit}>
          <input value={input} onChange={(event) => setInput(event.target.value)} aria-label="聊天输入" />
          <button type="submit" disabled={busy}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
}
