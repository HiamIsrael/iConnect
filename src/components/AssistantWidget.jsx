import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GUIDE_FALLBACK } from '../assistant/knowledge.js';
import { matchGuideIntent } from '../assistant/matcher.js';
import './AssistantWidget.css';

const MAX_INPUT_LENGTH = 240;
const PUBLIC_ROUTE_ROOTS = [
  '/',
  '/musicians',
  '/gigs',
  '/venues',
  '/bands',
  '/community',
  '/epk',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
];

const DEFAULT_SUGGESTIONS = ['Find a gig', 'Find a musician', 'How does iConnect work?', 'How do I sign up?'];

function getWelcomeMessage(pathname) {
  const suggestions = pathname.startsWith('/gigs')
    ? ['How do I apply?', 'Create a musician profile', 'Find a musician']
    : pathname.startsWith('/musicians')
      ? ['How do I create a profile?', 'Find a gig', 'What is an EPK?']
      : pathname.startsWith('/venues')
        ? ['Find a gig', 'Find a musician', 'How does iConnect work?']
        : pathname.startsWith('/bands') || pathname.startsWith('/community')
          ? ['Find collaborators', 'Find a gig', 'How do I sign up?']
          : DEFAULT_SUGGESTIONS;

  return {
    id: 'welcome',
    role: 'assistant',
    text: 'Hi, I am the iConnect Guide. Ask me how to find a gig, discover musicians, or get started.',
    suggestions,
  };
}

function isPublicRoute(pathname) {
  return PUBLIC_ROUTE_ROOTS.some((root) => root === '/' ? pathname === root : pathname === root || pathname.startsWith(`${root}/`));
}

export default function AssistantWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [getWelcomeMessage(pathname)]);
  const launcherRef = useRef(null);
  const closeRef = useRef(null);
  const inputRef = useRef(null);
  const historyEndRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const focusPanel = () => {
      (closeRef.current || inputRef.current)?.focus();
    };
    const frame = window.requestAnimationFrame(focusPanel);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        launcherRef.current?.focus();
      }
      return;
    }
    wasOpenRef.current = true;
    historyEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, open]);

  if (!isPublicRoute(pathname)) return null;

  const closePanel = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  const answerPrompt = (prompt) => {
    const trimmedPrompt = prompt.trim().slice(0, MAX_INPUT_LENGTH);
    if (!trimmedPrompt) return;

    const result = matchGuideIntent(trimmedPrompt, { currentPath: pathname });
    const answer = result.kind === 'fallback' ? GUIDE_FALLBACK : result;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: trimmedPrompt },
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: answer.answer,
        action: answer.action,
        suggestions: answer.suggestions,
      },
    ]);
    setInput('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    answerPrompt(input);
  };

  return (
    <div className="guide-widget">
      {open && (
        <section
          id="guide-panel"
          className="guide-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="guide-title"
          aria-describedby="guide-description"
        >
          <header className="guide-panel-header">
            <div>
              <p className="guide-kicker">A clear way in</p>
              <h2 id="guide-title">iConnect Guide</h2>
              <p id="guide-description">Ask about public pages and next steps. I only point you to iConnect pages.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="guide-close"
              aria-label="Close iConnect Guide"
              onClick={closePanel}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="guide-history" role="log" aria-live="polite" aria-label="iConnect Guide conversation">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`guide-message guide-message-${message.role}`}
                aria-label={message.role === 'user' ? 'Your question' : 'iConnect Guide response'}
              >
                <p className="guide-message-label">{message.role === 'user' ? 'You' : 'Guide'}</p>
                <p>{message.text}</p>
                {message.action && (
                  <Link className="guide-action" to={message.action.path} onClick={closePanel}>
                    {message.action.label}
                    <span aria-hidden="true"> →</span>
                  </Link>
                )}
                {message.suggestions?.length > 0 && (
                  <div className="guide-suggestions" aria-label="Suggested questions">
                    {message.suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => answerPrompt(suggestion)}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            <span ref={historyEndRef} aria-hidden="true" />
          </div>

          <form className="guide-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="guide-question">Ask the iConnect Guide</label>
            <input
              ref={inputRef}
              id="guide-question"
              type="text"
              value={input}
              maxLength={MAX_INPUT_LENGTH}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question..."
              autoComplete="off"
            />
            <button type="submit" className="btn primary" disabled={!input.trim()}>
              Ask
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        className={`guide-launcher${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls="guide-panel"
        aria-label={open ? 'Close iConnect Guide' : 'Open iConnect Guide'}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="guide-launcher-mark" aria-hidden="true">✦</span>
        <span>{open ? 'Close guide' : 'Ask the guide'}</span>
      </button>
    </div>
  );
}
