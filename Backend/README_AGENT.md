Backend Purpose
• Handles all business logic and data persistence for a child-care management system.• Exposes secure RESTful APIs for user management, child profiles, bookings, service usage, check-in/out, and analytics.
Tech Stack
• Language and framework: Python 3.10+, FastAPI• Database: PostgreSQL• ORM or query tools: SQLModel (built on SQLAlchemy)• API structure: RESTful endpoints organized by resource (users, sessions, services, etc.)
Architecture
• Module or layer structure:
* models/: SQLModel ORM classes
* schemas/: Pydantic data validation models
* services/: Business logic
* controllers/: API route handlers
* repositories/: Optional abstraction for DB queries
* core/: Security, settings, and startup logic
• Request/response flow:
* FastAPI routes accept input via Pydantic schemas
* Business logic handled in services
* Responses serialized via output schemas
• Sync or async behavior:
* Async endpoints and DB interactions using SQLModel and FastAPI async support
• Event processing or background jobs:
* Not implemented, but architecture allows for future integration (e.g., with Celery or FastAPI background tasks)
Authentication and Authorization
• Mechanisms used: OAuth2 Password Flow with JWT• Where auth logic is implemented:
* Token generation and validation in core/security.py
* Protected routes use FastAPI’s Depends system with reusable get_current_user and get_current_active_user dependencies
* Role logic handled via role_id and user lookups
Setup Instructions
• Required tools:
* Python 3.10+
* Poetry
* PostgreSQL
* Docker (optional for local full-stack setup)
• Environment variables (via .env):
* DATABASE_URL
* SECRET_KEY
* SMTP_USER, SMTP_PASSWORD, etc. (for email-based password recovery)
• How to run locally:
poetry install
poetry run uvicorn app.asgi:app --reload
• How to run database or migrations:
* Alembic integration expected (manual or via scripts)
* Alternatively, generate tables with SQLModel programmatically via SQLModel.metadata.create_all(engine)
Testing Strategy
• Types of tests: Unit and integration• Tools used: Pytest, pytest-asyncio, httpx• How tests are executed:
poetry run pytest
API Documentation
• Tooling: FastAPI’s built-in OpenAPI (Swagger UI)• How to view docs:
* Start the server and visit /docs (Swagger) or /redoc (ReDoc)• How to regenerate OpenAPI client:
* Use openapi-typescript or openapi-generator with http://localhost:8000/openapi.json
Deployment
• Environments and stages:
* Local (via Poetry or Docker Compose)
* Staging and production (via Docker, with Traefik as reverse proxy)
• CI/CD pipelines:
* GitHub Actions for testing and container build/deploy
• Secrets and config handling:
* .env for local
* Use Docker secrets or cloud-managed secret stores for production
