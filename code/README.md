# Weave

A collaborative visual app-building workspace built with React, Vite, Express, and WebSockets. Everything lives in this `code` folder.

## Run locally

Use Node.js 22.12 or newer.

```sh
cd code
npm install
npm run dev
```

Open http://localhost:3000. The development server handles the frontend, API, and collaboration on the same port. It listens on the local network so teammates can use `http://YOUR_COMPUTER_IP:3000`; allow incoming connections if your operating system asks. Share links copied from a localhost URL work only on the same computer.

```sh
npm run build  # production frontend
npm start      # serve the built app and API
npm test       # model tests and a temporary two-client integration server
```

## What is implemented

- Dashboard with prompt-led project creation, three starter templates, search, grid/list views, stars, and duplication.
- Frontend canvas with nested layers, individual element selection, double-click contextual prompting, a persistent general prompt bar, property editing, responsive canvas sizes, zoom, preview, and export.
- Backend canvas with connected, draggable steps, contextual and global prompts, editable step configuration, insertion/removal of transforms, and a request runner.
- Live multi-user presence, cursors, shared changes, activity, reconnect, and revision conflict checks over WebSockets.
- Shared undo for the most recent canvas/backend change, with a bounded history of 30 snapshots.
- Durable local projects and collection records in `.data/workspace.json`, written using an atomic file replacement.
- Keyboard-accessible controls, dialog focus trapping, responsive application layout, and reduced-motion support.

## Enable AI generation

Copy `.env.example` to `.env` inside `code`, add your own `OPENAI_API_KEY`, and restart the server. The key is read on the server and never sent to a browser. You can change `OPENAI_MODEL` to a Responses-compatible model available to your account; the default is `gpt-4.1-mini`.

The server uses the [OpenAI Responses API with JSON output](https://developers.openai.com/api/docs/guides/structured-outputs). All returned canvas trees and backend graphs are validated before applying them. Scoped prompts are restricted to the selected element; concurrent revisions cause generation to be rejected without overwriting someone else’s changes. Provider failures are surfaced in the UI.

Without a key, the app explicitly displays **Demo mode**. Initial prompts choose a dashboard, portfolio, or store template. Deterministic edits include:

- `Make it blue`, `Make it green`, or a six-digit hex color.
- `Change text to "Your new heading"`.
- `Make it bigger`, `Make it smaller`, `Make it rounded`.
- `Add more spacing`, `Add a section`, `Use a dark background`.
- Backend: `Rename to "Check input"`, `require email` on a validation step, `save records` / `read records` on a database step.

Unsupported demo prompts show an explanation instead of pretending to run AI. Live provider calls require your API key and have not been verified against a paid account as part of this build.

## Backend behavior

The backend editor builds a safe declarative workflow, not arbitrary executable server code. Supported steps are:

| Step      | Behavior                                                   |
| --------- | ---------------------------------------------------------- |
| Request   | Entry-point method/path metadata                           |
| Validate  | Check comma-separated required input fields                |
| Database  | Read or append records to a named project-local collection |
| Transform | Wrap the result in a named property                        |
| Response  | Set the returned status                                    |

Use **Test flow** to send JSON through every step. Writes persist; reads return saved records. The runner calls `POST /api/projects/:id/run` with the project token. Request method/path settings describe the workflow and do not register new HTTP routes. Flow execution is linear, and cyclic, disconnected, or branching graphs are rejected with an explanation.

## Scope and deployment

This is a runnable local/shared-team MVP. All people who can reach the server share the workspace dashboard. Project links include edit capabilities, but the project list is intentionally shared; there is no account authentication, organization isolation, or role-based access. Keep it on a trusted network until you add those controls, HTTPS, request rate limits, and an appropriate deployment configuration.

Generated interfaces use a validated component tree: containers, text, buttons, badges, metrics, charts, activity lists, and artwork. They are editable visual prototypes. Preview controls do not generate arbitrary event handlers or automatically call backend flows. HTML export preserves layout/text; charts and composite widgets export simplified text. JSON export retains the full component tree and flow definition. There is no hosted deployment pipeline or external service integration.

The file store is designed for a single server process. For production scale, replace it with transactional storage and shared presence infrastructure. Shared undo affects the whole project; it is not a per-user CRDT undo stack.

## Structure

```text
src/main.jsx          Application shell, dashboard, editor, dialogs, client state
src/Canvas.jsx        Component-tree renderer, layers, thumbnails, HTML export
src/Backend.jsx       Backend flowchart and drag interaction
src/styles.css        Responsive UI system
server/index.js       HTTP API, WebSocket collaboration, persistence, AI adapter
server/model.js       Starter documents, validators, demo edits, workflow runtime
tests/                Unit and two-client integration tests
```

## Design references

The interface follows a tool-first layout: persistent navigation, a large central canvas, contextual controls, one accent color, and consistent spacing. Research started with the supplied [Kole Jain](https://www.youtube.com/@kolejain) and [Tim Gabe](https://www.youtube.com/@TimGabe/videos) channels. Indexed material and public summaries were available; direct video playback was not available during the build. The application is an original design, not a reproduction of either creator’s work.

## Screenshots

[Dashboard](docs/screenshots/dashboard.png) · [Frontend editor](docs/screenshots/frontend.png) · [Backend flowchart](docs/screenshots/backend.png)
