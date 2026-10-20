# DarkHangar Frontend

React + Vite single-page app: the instrument-panel dashboard, track
maps, and data-inspection UI for DarkHangar V2. It talks to the
FastAPI backend in `../backend`.

## Develop

```bash
npm install
npm run dev
```

The dev server runs on Vite's port 5173, which the backend's CORS
configuration allows.

## Other commands

- `npm run build` — production build (the output is served by the
  backend as its static UI).
- `npm run preview` — preview the production build locally.
- `npm run lint` — lint with oxlint.
