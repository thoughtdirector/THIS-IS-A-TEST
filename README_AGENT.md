Project Overview
• Project name: CasaDelArbol• One-line purpose of the project: A platform to manage child-care center services, child profiles, bookings, and QR-based check-in/out.• Intended users or use case: Parents, staff, and administrators of recreational and educational child-care facilities.
Functional Goals
• Problems the project solves: Centralizes scheduling, child profile management, service purchases, and attendance tracking into one system.• High-level product vision: Provide a secure, scalable digital infrastructure for managing real-world child-care operations with real-time visibility.
Tech Stack Summary
• Frontend technologies: React, TypeScript, Vite, Chakra UI• Backend technologies: FastAPI, SQLModel, Pydantic, PostgreSQL, JWT, Passlib• DevOps and infrastructure: Docker Compose, Traefik (reverse proxy with HTTPS), GitHub Actions (CI/CD), SMTP for email recovery
Architecture Summary
• Communication between services: React frontend communicates with FastAPI backend via a generated TypeScript client using REST APIs• Authentication strategy: JWT-based OAuth2 password flow with secure password hashing and email recovery support• Data flow overview: User actions from frontend trigger API calls → backend services → PostgreSQL via SQLModel ORM → responses sent back via API client
Environments
• Local: Run via Poetry and Docker Compose, developer-focused setup• Staging: Docker Compose or container orchestration with test domains and certificates• Production: Traefik-managed HTTPS services, persistent database, secure email and secrets, GitHub Actions for deployments
Repository Structure
• frontend/: React app with Chakra UI and auto-generated API client• backend/: FastAPI app with MVC structure, includes services, models, schemas, and tests• scripts/: Setup, migration, and deployment helpers• hooks/: Project-level Git hooks and linters• img/: Images and visual assets• .github/: GitHub Actions workflows• docker-compose.yml: Defines services including Traefik, frontend, backend, database
How to Run the Project
• Prerequisites: Docker, Docker Compose, Node.js, Python 3.10+, Poetry• Setup steps:
* Run poetry install in backend/
* Run npm install in frontend/• Run commands for local environment:
* docker compose up --build to start full stack
* poetry run pytest to test backend
* npx playwright test to test frontend
Development Practices
• Version control flow: Git with feature branches, PR-based workflow• Code review or branching policies: PR required for merge to main; use conventional commits• Naming conventions: Snake_case for Python, camelCase for TypeScript, PascalCase for components
Extensions
• See frontend/README_AGENT.md for frontend-specific setup
• See backend/README_AGENT.md for backend-specific setup
• See backend/docs/ for API docs and Swagger/OpenAPI generation• See docker/ or scripts/ for deployment scripts• See .github/workflows/ for CI/CD details
