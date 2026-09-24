# Spec: iConnect Guide Assistant

## Objective

Build a small in-product assistant that helps visitors understand iConnect, answers common questions about the public website, and takes them to the right internal page. It should feel like a useful guide embedded in the product—not a generic AI chat window—and it must be predictable, privacy-safe, and easy to verify.

The first release uses curated, deterministic answers. An unresolved question receives an honest fallback and a useful next step. An external AI provider is a separate future capability and is not part of this implementation.

## User Journeys

1. A visitor opens the guide from any public page and chooses a suggested question.
2. A visitor asks how to find a gig, musician, venue, band, EPK, or signup path and receives a concise answer with an internal navigation action.
3. A musician asks how to build a profile, browse gigs, or apply and is taken to the relevant public page or signup entry point.
4. An organizer asks how to find musicians or post a gig and is taken to the relevant discovery or conversion path.
5. A visitor asks something unknown or outside scope and receives a transparent fallback without fabricated information or external data transfer.

## Product Defaults

- **Name:** iConnect Guide
- **Audience:** public visitors, musicians, and organizers
- **Tone:** clear, warm, practical, and music-aware
- **Language:** English first
- **Action boundary:** internal navigation only; no data mutation
- **Privacy:** do not send messages to a server, store transcripts, inspect tokens, or request sensitive information
- **Availability:** public routes only in the first release; the guide can be hidden on admin and sensitive account screens until separately reviewed

## Approved Intent Set

The initial knowledge set should cover a small set of high-confidence intents:

- What is iConnect?
- Find a gig
- Find a musician
- Browse venues
- Browse bands/community
- Create a musician profile
- Post a gig
- View an EPK
- Apply to a gig
- How signup works
- How login works
- Where to get help

Each intent contains:

- Stable id
- Trigger phrases/examples
- Short answer
- One primary internal route action
- Optional follow-up prompts
- Role/context hints

## Navigation Safety

The guide may navigate only to a static allowlist of known internal paths, including:

- `/`
- `/musicians`
- `/gigs`
- `/venues`
- `/bands`
- `/community`
- `/signup?next=...`
- `/login?next=...`

Routes must be generated from approved intent metadata, never directly from user text. External URLs are not actions in the first release.

## UI Requirements

- A visible launcher with an accessible name such as “Open iConnect Guide”.
- A dialog or complementary panel with a labelled heading, close button, and logical focus behavior.
- A short welcome message and 3–5 context-sensitive suggested prompts.
- User messages and assistant responses with distinct accessible labels.
- Input with an explicit label, submit button, disabled/loading state, and a clear fallback for unknown questions.
- Internal navigation actions rendered as normal keyboard-accessible links or buttons.
- Escape closes the panel; focus returns to the launcher.
- The guide must not cover essential content on small screens and must respect reduced motion.
- No fake typing delay is required; immediate, deterministic responses are preferred.

## Matching Behavior

- Normalize case, whitespace, and punctuation.
- Match explicit intent phrases using deterministic scoring.
- Require a confidence threshold before presenting a specific answer.
- Prefer route context when two intents have equal scores.
- Never infer private account state or user identity.
- Limit input length and ignore empty submissions.
- If no match clears the threshold, return the approved fallback:
  - State that the guide does not know that yet.
  - Offer the main discovery links.
  - Suggest a human/support path only if one exists in the product.

## Tech Stack and Commands

The guide stays inside the existing stack:

- React 18.3.1
- React Router 6.26.2
- Vite 5.4.8
- Plain CSS and existing design tokens
- Vitest 2.1.9 for deterministic matcher tests

```bash
npm test
npm run build
npm run preview:app
```

No new runtime dependency or external AI SDK is allowed in this first release.

## Project Structure

```text
src/assistant/
  knowledge.js       # curated intent data
  matcher.js         # pure normalization and scoring
  navigation.js      # approved internal destinations
src/components/
  AssistantWidget.jsx
  AssistantMessage.jsx (only if a separate component earns its complexity)
test/
  assistant-matcher.test.js
  assistant-knowledge.test.js
```

Keep knowledge and matching pure so they can be tested without a browser. Keep widget state local and separate from auth/API state.

## Testing Strategy

### Unit tests

- Normalization handles case, punctuation, whitespace, and empty input.
- Each approved intent matches representative phrases.
- Unknown questions use fallback instead of guessing.
- The score threshold prevents weak matches.
- All returned navigation paths belong to the allowlist.
- User input cannot become an arbitrary destination.

### Browser verification

- Launcher is present and named on public routes.
- Dialog/panel opens and closes with mouse, keyboard, and Escape.
- Focus moves into the panel and returns to the launcher.
- Suggested prompts produce the expected response and navigation.
- Long questions, empty input, unknown input, narrow widths, and reduced motion work.
- No console warnings or failed network requests are introduced.

## Boundaries

### Always do

- Keep answers concise, specific, and backed by the current site structure.
- Treat user text as untrusted input.
- Use only approved internal routes.
- Keep matching deterministic and locally testable.
- Make the assistant optional; core site navigation must remain usable without it.
- Update the knowledge tests whenever an intent is added or changed.

### Ask first

- Adding an external AI provider or sending user text outside the browser.
- Persisting transcripts or analytics tied to a user.
- Reading private profile, application, message, payment, or auth data.
- Allowing the guide to submit forms or mutate product data.
- Adding a new dependency.

### Never do

- Claim that an action was completed when the guide only navigated.
- Invent policies, availability, fees, profiles, or booking outcomes.
- Read or expose tokens, passwords, private messages, or local storage credentials.
- Navigate to arbitrary URLs derived from user text.
- Block or obscure the primary website experience.

## Success Criteria

- The widget is available and accessible on the approved public routes.
- At least 10 approved intents have representative passing tests.
- Known questions produce the expected answer and internal navigation action.
- Unknown questions never produce fabricated product claims.
- No assistant behavior requires an API call or external service.
- Core site routes and workflows remain usable with the widget closed.
- `npm test` and `npm run build` pass.
- Browser review finds no focus trap, keyboard failure, console error, or critical responsive issue.

## Future Extension

A provider-backed conversational layer may be considered only after the curated guide proves its value. That future spec must define provider choice, data minimization, rate limiting, prompt injection resistance, moderation, cost controls, auditability, and user disclosure before implementation.

## Approval Gate

Review this spec before implementing `src/assistant/` or `AssistantWidget.jsx`.
