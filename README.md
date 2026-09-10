# DevTrack — Task Manager Application

A web-based task management tool that lets a registered user securely log in, create, edit, sort, and track their daily tasks through a clean React dashboard backed by a Node.js/Express API.

**Prepared by:** Anirudh Dharane (Project Manager) — PES1UG24CS555

---

## 1. Project Overview

| | |
|---|---|
| **Project Name** | Task Manager Application |
| **Organisation** | DevTrack-Task-Manager |
| **Description** | A dynamic digital workspace where any user can log in to create, edit, sort, and track their daily tasks. |
| **Submission Deadline** | Friday (end of week) |

The project follows the SDLC framework: requirements are captured in an SRS, verified through a structured Test Plan, and implemented against the agreed stack below.

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | **React.js** | Visual layout, forms, task columns — clean and responsive UI |
| Backend | **Node.js + Express.js** | REST API, business logic, task/user processing |
| Authentication | **JWT (JSON Web Token)** | Session/login state management |
| Password Security | **Bcrypt** | Hashing and securely storing user passwords |
| Database | *TBD — to be finalized by Dev Lead* | Persistent storage for users and tasks |
| Version Control | **Git + GitHub** | Source control and team collaboration |

> Node.js was chosen over Django to keep the stack single-language (JavaScript) across frontend and backend, reducing context-switching for a 4-person team on a short timeline.

## 3. Core Features

- User registration and login
- JWT-based authentication with bcrypt password hashing
- Create, view, edit, and delete tasks (CRUD)
- Update task status: **Pending / In Progress / Completed**
- Set task priority: **Low / Medium / High**
- Filter tasks by status and/or priority
- Responsive task dashboard

*Out of scope for this version:* real-time collaboration, chat, calendar integration, notifications, and third-party productivity-service integrations.

## 4. Team & Roles

| Name | SRN | Role | Responsibilities |
|---|---|---|---|
| Anirudh Dharane | PES1UG24CS555 | Project Manager | GitHub org/repo setup, branch management, coordination, final review & merges |
| Mohith N | PES1UG24CS580 | Requirements/SRS Lead | Owns the SRS document and functional requirements |
| Chiranthan HG | PES1UG24CS564 | QA/Test Lead | Owns the Test Plan and test case design |
| Akula Sai Nandan Royal | PES1UG24CS553 | Dev Lead | Backend/security architecture (Node/Express, JWT, Bcrypt, DB) |

## 5. Repository Structure

```
DevTrack-Task-Manager/
├── README.md
├── docs/
│   ├── SRS-Task-Manager.docx
│   └── Test-Plan-Task-Manager.docx
├── client/          # React frontend (to be added)
└── server/          # Node/Express backend (to be added)
```

## 6. Branching Strategy

- `main` — protected, production-ready, PM-only merge rights
- `dev` — active development branch; all team members work and PR from here

## 7. Getting Started (for once development begins)

```bash
# Clone the repository
git clone https://github.com/DevTrack-Task-Manager/task-manager-application.git
cd task-manager-application

# Frontend setup
cd client
npm install
npm start

# Backend setup
cd ../server
npm install
npm run dev
```

Environment variables (backend `.env`, once finalized):
```
PORT=5000
DB_URI=<to be finalized>
JWT_SECRET=<your-secret-key>
```

## 8. Documentation

- [`docs/SRS-Task-Manager.docx`](docs/SRS-Task-Manager.docx) — full Software Requirements Specification
- [`docs/Test-Plan-Task-Manager.docx`](docs/Test-Plan-Task-Manager.docx) — test cases mapped to each functional requirement

## 9. Contribution Workflow

1. Pull latest `dev` branch
2. Create a feature branch off `dev` (e.g. `feature/task-crud`)
3. Commit with clear messages
4. Open a PR into `dev`
5. PM reviews and merges into `main` before submission
