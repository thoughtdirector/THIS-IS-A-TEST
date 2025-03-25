Frontend Purpose
• Provides a web interface for parents, staff, and administrators to interact with the child-care management system.• Platform: Web application (desktop and mobile responsive)
Tech Stack
• Framework: React (Vite)• Language: TypeScript• UI system: Chakra UI with dark mode support• State management: React Hooks and Context API (local state only)• Routing: React Router• Testing libraries: Playwright for end-to-end testing; optional support for Vitest and Testing Library for unit tests
Folder Structure
• src/components/: Reusable UI components• src/pages/: Top-level route views• src/hooks/: Custom React hooks• src/api/: Auto-generated API client from OpenAPI schema• src/theme/: Chakra UI configuration and theme overrides• src/utils/: Utility functions and helpers• public/: Static assets• dist/: Output folder from production build
API Communication
• Communication type: RESTful API via generated TypeScript client• Auth tokens: Stored in memory or localStorage; attached to headers using Axios interceptors in the generated client
Setup Instructions
• Dependencies: Node.js 16+, npm• Environment variables:
* VITE_API_BASE_URL
* VITE_AUTH_TOKEN_KEY (if using localStorage)
• Setup commands:
npm install
• Run locally:
npm run dev
• Build for production:
npm run build
Testing Instructions
• Tests: Written using Playwright for E2E coverage• Execution:
npx playwright install
npx playwright test
• Coverage: Not enforced, but tests should cover critical flows like login, bookings, and check-in/out
Deployment
• Target platform: Served via static file server (e.g., Nginx) behind Traefik• CI/CD: GitHub Actions handles build and deployment to Docker containers

