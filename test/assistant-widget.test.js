import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StaticRouter } from 'react-router-dom/server.js';
import AssistantWidget from '../src/components/AssistantWidget.jsx';

function renderWidget(path) {
  return renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: path },
      React.createElement(AssistantWidget),
    ),
  );
}

describe('iConnect Guide widget', () => {
  it('renders an accessible launcher on public routes', () => {
    const markup = renderWidget('/gigs');

    expect(markup).toContain('aria-label="Open iConnect Guide"');
    expect(markup).toContain('aria-controls="guide-panel"');
    expect(markup).toContain('Ask the guide');
  });

  it('stays hidden on private account routes', () => {
    expect(renderWidget('/profile')).toBe('');
    expect(renderWidget('/admin')).toBe('');
  });
});
