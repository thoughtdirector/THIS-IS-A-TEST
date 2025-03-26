# CasaArbol Project Guide

## Commands

### Backend (from `/backend` directory)
- Setup: `poetry install`
- Activate env: `poetry shell`
- Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- Test: `bash ./scripts/test.sh`
- Single test: `pytest app/tests/path/to/test.py::test_name -v`
- Migrations: `alembic revision --autogenerate -m "message"` then `alembic upgrade head`

### Frontend (from `/frontend` directory)
- Setup: `npm install`
- Run: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npx playwright test`

## Code Style

### Backend
- Use PEP 8 standards
- Type hints required
- Async/await pattern for DB operations
- Model definitions in `models.py`
- API routes in `api/routes/`
- Exception handling with proper HTTP status codes

### Frontend
- React components: PascalCase
- Use hooks for state management
- TypeScript preferred for new components
- Use tailwind for styling
- Organize by feature in components/ directory