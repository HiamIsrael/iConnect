import { describe, expect, it } from 'vitest';
import {
  GUIDE_DESTINATIONS,
  GUIDE_INTENTS,
  matchGuideIntent,
  normalizeGuideInput,
} from '../src/assistant/matcher.js';

describe('iConnect Guide matcher', () => {
  it('normalizes punctuation, whitespace, and case', () => {
    expect(normalizeGuideInput('  Where can I FIND a GIG?!  ')).toBe('where can i find a gig');
  });

  it('matches a musician looking for an opportunity', () => {
    const result = matchGuideIntent('Where can I find an open gig?', { currentPath: '/' });

    expect(result.intentId).toBe('find-gig');
    expect(result.kind).toBe('answer');
    expect(result.action.path).toBe('/gigs');
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('matches an organizer looking for talent', () => {
    const result = matchGuideIntent('I need to book a singer for my event', { currentPath: '/' });

    expect(result.intentId).toBe('find-musician');
    expect(result.action.path).toBe('/musicians');
  });

  it.each([
    ['What is iConnect?', 'about-iconnect'],
    ['I want to find an open gig', 'find-gig'],
    ['I need to book a singer', 'find-musician'],
    ['Help me find a venue', 'browse-venues'],
    ['Show me the community feed', 'browse-community'],
    ['I want to join a band', 'browse-bands'],
    ['How can I create a profile?', 'create-profile'],
    ['How do I post a gig?', 'post-gig'],
    ['What is an EPK?', 'view-epk'],
    ['How do I apply?', 'apply-to-gig'],
    ['How do I sign up?', 'signup'],
    ['Please sign in', 'login'],
  ])('covers the curated intent %s', (prompt, intentId) => {
    const result = matchGuideIntent(prompt, { currentPath: '/' });

    expect(result.kind).toBe('answer');
    expect(result.intentId).toBe(intentId);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('uses route context to break a close tie', () => {
    const result = matchGuideIntent('How do I create a profile?', { currentPath: '/gigs' });

    expect(result.intentId).toBe('create-profile');
    expect(result.action.path).toContain('/signup');
  });

  it('returns a safe fallback for unknown questions', () => {
    const result = matchGuideIntent('Can you tell me the weather tomorrow?', { currentPath: '/' });

    expect(result.kind).toBe('fallback');
    expect(result.intentId).toBeNull();
    expect(result.action.path).toBe('/');
  });

  it('returns a safe fallback for empty input', () => {
    const result = matchGuideIntent('   ');

    expect(result.kind).toBe('fallback');
    expect(result.confidence).toBe(0);
  });

  it('keeps every approved action inside the navigation allowlist', () => {
    for (const intent of GUIDE_INTENTS) {
      expect(GUIDE_DESTINATIONS.has(intent.action.path)).toBe(true);
    }
  });

  it('does not turn user text into an arbitrary destination', () => {
    const result = matchGuideIntent('https://example.com/steal-data');

    expect(GUIDE_DESTINATIONS.has(result.action.path)).toBe(true);
    expect(result.action.path).not.toContain('example.com');
  });
});
