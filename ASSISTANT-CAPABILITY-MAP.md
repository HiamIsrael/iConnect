# Capability Map: iConnect Guide Assistant

**Status:** Draft for implementation review  
**Date:** 2026-09-24  
**Dependency:** Public website implementation and QA gate

## Initiative

Add a small, trustworthy in-product guide that helps visitors understand iConnect, answers common product questions, and navigates them to approved internal pages. The first release is deliberately curated and navigation-only. It is not an autonomous agent and does not perform account, booking, payment, messaging, or content actions.

## Capability Boundaries

| Module id | Responsibility | Depends on |
|---|---|---|
| `guide-knowledge` | Curated intents, answers, follow-up prompts, and route metadata | — |
| `guide-matcher` | Deterministic matching of user text to approved intents with confidence thresholds | `guide-knowledge` |
| `guide-widget` | Accessible launcher, panel, conversation history, quick prompts, and response states | `guide-knowledge`, `guide-matcher` |
| `guide-navigation` | Allowlisted internal navigation actions and current-route context | `guide-widget` |
| `guide-safety` | No-mutation boundary, unknown-question fallback, input limits, and privacy-safe behavior | `guide-matcher`, `guide-navigation` |
| `guide-verification` | Unit, route, keyboard, accessibility, and browser checks for the guide | all modules |

## Build Order

```text
guide-knowledge
       │
       ▼
guide-matcher ───► guide-navigation
       │                  │
       └──────────────► guide-widget
                              │
                              ▼
                       guide-safety
                              │
                              ▼
                     guide-verification
```

## Explicitly Deferred

- External AI provider integration
- Conversation persistence or user profiling
- Automatic form submission, applications, posting, messaging, payments, or account changes
- Voice input/output
- Training on user conversations
- Answers that require private account data
- Unrestricted arbitrary URL navigation

## First-Release Defaults

- Audience: public visitors plus musicians and organizers browsing the public site
- Language: clear, warm English
- Actions: answer and navigate only
- Storage: in-memory conversation state only; no server-side transcript by default
- Knowledge: versioned, project-owned content reviewed alongside the website
