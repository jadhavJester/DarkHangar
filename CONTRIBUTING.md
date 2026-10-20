# Contributing to DarkHangar

## Development setup

Backend (Python, FastAPI):

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app
```

Frontend (React, Vite):

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs on port 5173, which the backend's CORS
configuration allows.

## Tests

Run the backend suite before submitting changes:

```bash
cd backend
python -m pytest
```

New parser or metrics behaviour should come with tests in
`backend/tests/`, following the existing style: load the module under
test by file path and pin behaviour with small synthetic inputs.

## Commit style

History uses [Conventional Commits](https://www.conventionalcommits.org/)
— e.g. `feat:`, `fix:`, `test:`, `docs:`, `chore:` — one logical change
per commit.
