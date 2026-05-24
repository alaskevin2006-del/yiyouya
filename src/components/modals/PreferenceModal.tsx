import { useState } from 'react';
import { agentService } from '../../services/agentService';
import { useAppStore } from '../../store/appStore';
import { Modal } from '../common/Modal';

const exclusivePreferenceGroups = [
  { title: '景观偏好', options: ['自然风光', '人文风光'] },
  { title: '行程密度', options: ['紧凑行程', '松弛行程'] },
  { title: '旅行节奏', options: ['快节奏', '慢节奏'] },
  { title: '地点范围', options: ['国内旅行', '国外旅行'] },
];

const parallelPreferenceGroups = [
  { title: '兴趣爱好', options: ['音乐', '美术', '运动', '美食', '摄影', '书店', '市集', '博物馆'] },
  { title: '体验方式', options: ['爬山', '海边', '露营', '夜游', '咖啡馆', '小众街区', '娱乐设施', '亲子友好'] },
];

export function PreferenceModal() {
  const activeModal = useAppStore((state) => state.activeModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const openModal = useAppStore((state) => state.openModal);
  const updatePreferences = useAppStore((state) => state.updatePreferences);
  const preferenceSaveTarget = useAppStore((state) => state.preferenceSaveTarget);
  const initialText = useAppStore((state) => state.user.preferenceText ?? '');
  const initialSummary = useAppStore((state) => state.preferenceSummary);
  const [text, setText] = useState(initialText);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [exclusiveSelections, setExclusiveSelections] = useState<Record<string, string>>({});
  const [parallelSelections, setParallelSelections] = useState<string[]>([]);

  const syncTagText = (nextExclusive: Record<string, string>, nextParallel: string[]) => {
    const tagText = [...Object.values(nextExclusive), ...nextParallel].filter(Boolean).join('、');
    if (!tagText) return;
    setText((current) => {
      const base = current.replace(/^偏好标签：.*?。\s*/u, '').trim();
      return `偏好标签：${tagText}。${base}`;
    });
  };

  const selectExclusiveTag = (groupTitle: string, tag: string) => {
    const next = { ...exclusiveSelections, [groupTitle]: tag };
    setExclusiveSelections(next);
    syncTagText(next, parallelSelections);
  };

  const toggleParallelTag = (tag: string) => {
    const next = parallelSelections.includes(tag) ? parallelSelections.filter((item) => item !== tag) : [...parallelSelections, tag];
    setParallelSelections(next);
    syncTagText(exclusiveSelections, next);
  };

  const handleSummarize = async () => {
    setLoading(true);
    const nextSummary = await agentService.summarizePreferences(text);
    setSummary(nextSummary);
    setLoading(false);
  };

  const handleConfirm = async () => {
    const nextSummary = summary || (await agentService.summarizePreferences(text));
    updatePreferences(text, nextSummary);
    if (preferenceSaveTarget === 'worldType') {
      openModal('worldType');
      return;
    }
    closeModal();
  };

  return (
    <Modal title="设置旅行偏好" open={activeModal === 'preference'} onClose={closeModal}>
      <div className="modal-body">
        <div className="preference-tag-board">
          {exclusivePreferenceGroups.map((group) => (
            <section className="preference-card" key={group.title}>
              <span>{group.title}</span>
              <div className="preference-tags">
                {group.options.map((tag) => (
                  <button
                    className={exclusiveSelections[group.title] === tag ? 'selected' : ''}
                    type="button"
                    key={tag}
                    onClick={() => selectExclusiveTag(group.title, tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {parallelPreferenceGroups.map((group) => (
            <section className="preference-card" key={group.title}>
              <span>{group.title}</span>
              <div className="preference-tags">
                {group.options.map((tag) => (
                  <button className={parallelSelections.includes(tag) ? 'selected' : ''} type="button" key={tag} onClick={() => toggleParallelTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <label className="field">
          <span>告诉宠物你喜欢怎样的旅行</span>
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="例如：喜欢安静街区、自然风景、慢节奏散步。" />
        </label>
        <button type="button" onClick={handleSummarize} disabled={loading}>
          {loading ? '总结中...' : '一键总结偏好'}
        </button>
        {summary && <p className="summary-box">{summary}</p>}
        <button className="primary-button" type="button" onClick={handleConfirm}>
          保存偏好
        </button>
      </div>
    </Modal>
  );
}
