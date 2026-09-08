import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { timeAgo } from '../lib';

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialOther = params.get('to') || '';
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [other, setOther] = useState(null);
  const [activeThread, setActiveThread] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  async function loadThreads() {
    const data = await api.get('/messages/threads');
    setThreads(data.threads);
    return data.threads;
  }

  async function openThread(otherId) {
    if (!otherId) return;
    const data = await api.get(`/messages/with/${otherId}`);
    setMessages(data.messages);
    setOther(data.other);
    setActiveThread(data.other.id);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await loadThreads();
        const target = initialOther || list[0]?.user?.id || '';
        if (target) await openThread(target);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!other || !body.trim()) return;
    setSending(true);
    try {
      const data = await api.post(`/messages/with/${other.id}`, { body });
      setMessages((m) => [...m, data.message]);
      setBody('');
      loadThreads();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page container">
      <h1 className="page-title">Messages</h1>
      <p className="page-subtitle">Chat directly with musicians and organizers.</p>

      {loading ? (
        <div className="loader">Loading…</div>
      ) : (
        <div className="detail-grid" style={{ gridTemplateColumns: '320px 1fr' }}>
          <div className="detail-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '4px 10px 10px' }}>Conversations</div>
            {threads.length === 0 ? (
              <div className="muted" style={{ fontSize: 14, padding: 10 }}>No conversations yet.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  className="btn ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', gap: 10, textAlign: 'left', borderRadius: 10, marginBottom: 4, background: activeThread === t.user?.id ? 'var(--bg-elevated)' : 'transparent' }}
                  onClick={() => openThread(t.user.id)}
                >
                  <Avatar name={t.user?.name || '?'} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.user?.name}</span>
                    <span className="faint" style={{ fontSize: 12, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.lastMessage.body} · {timeAgo(t.lastMessage.createdAt)}
                    </span>
                  </span>
                  {t.unread > 0 && <span className="badge brand">{t.unread}</span>}
                </button>
              ))
            )}
          </div>

          <div className="detail-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 420 }}>
            {other ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--line-soft)' }}>
                  <Avatar name={other.name} size={44} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{other.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{other.role === 'organizer' ? 'Organizer' : 'Musician'}</div>
                  </div>
                </div>

                <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 2px' }}>
                  {messages.length === 0 ? (
                    <div className="muted" style={{ textAlign: 'center', paddingTop: 40 }}>Say hello 👋</div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.senderId === user.id ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                        <div className={m.senderId === user.id ? 'alert success' : 'alert'} style={{ maxWidth: '76%', marginBottom: 0, whiteSpace: 'pre-wrap', width: 'auto' }}>
                          {m.body}
                          <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>{timeAgo(m.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }} onSubmit={handleSend}>
                  <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Message ${other.name}…`} style={{ flex: 1 }} />
                  <button className="btn primary" disabled={sending || !body.trim()}>{sending ? '…' : 'Send'}</button>
                </form>
              </>
            ) : (
              <div className="empty" style={{ border: 0 }}>Select a conversation to start chatting.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
