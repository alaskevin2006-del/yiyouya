import type { DiaryEntry } from '../../types';

interface DiaryListProps {
  entries: DiaryEntry[];
  showTitle?: boolean;
}

export function DiaryList({ entries, showTitle = true }: DiaryListProps) {
  return (
    <section className="panel diary-panel">
      {showTitle && <h2>图文游记</h2>}
      {entries.map((entry) => (
        <article className="diary-entry" key={entry.id}>
          <img src={entry.imageUrl} alt={entry.title} />
          <div>
            <h3>{entry.title}</h3>
            <p>{entry.content}</p>
            <small>{new Date(entry.createdAt).toLocaleString()}</small>
          </div>
        </article>
      ))}
      {entries.length === 0 && <p className="muted">还没有生成游记。</p>}
    </section>
  );
}
