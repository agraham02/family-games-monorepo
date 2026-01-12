# 🎮 Family Game Room

A real-time multiplayer game platform for playing classic card and board games with family and friends. Built as a modern monorepo with shared types, validation, and utilities.

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-5-green?logo=express)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-white?logo=socket.io)
![pnpm](https://img.shields.io/badge/pnpm-9-orange?logo=pnpm)

## 🎯 Features

- **Real-time multiplayer** - WebSocket-powered gameplay with instant updates
- **Multiple games** - Spades, Dominoes, and more coming soon
- **Team-based play** - Automatic team assignment and management
- **Spectator mode** - Watch games in progress
- **Reconnection support** - Rejoin games after disconnection
- **Mobile-friendly** - Responsive design with PWA support
- **Turn timers** - Optional time limits with auto-play

## 📁 Project Structure

```
family-games-monorepo/
├── apps/
│   ├── client/              # Next.js 15 frontend (React 19)
│   │   ├── src/
│   │   │   ├── app/         # App router pages
│   │   │   ├── components/  # React components
│   │   │   ├── contexts/    # React contexts (Session, WebSocket)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── services/    # API service functions
│   │   └── public/          # Static assets
│   │
│   └── api/                 # Express 5 backend
│       ├── src/
│       │   ├── controllers/ # Route handlers
│       │   ├── services/    # Business logic
│       │   ├── games/       # Game implementations
│       │   ├── webhooks/    # Socket.IO event emitters
│       │   └── utils/       # Utility functions
│       └── docs/            # API documentation
│
├── packages/
│   └── shared/              # Shared code package
│       ├── src/
│       │   ├── types/       # TypeScript interfaces
│       │   ├── validation/  # Zod schemas & validators
│       │   ├── utils/       # Shared utilities
│       │   └── constants/   # Game constants & metadata
│       └── dist/            # Compiled output
│
├── pnpm-workspace.yaml      # Workspace configuration
├── vercel.json              # Vercel deployment config
└── render.yaml              # Render deployment config
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+ (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/agraham02/family-games-monorepo.git
cd family-games-monorepo

# Install all dependencies
pnpm install

# Build the shared package (required before running apps)
pnpm build:shared
```

### Development

```bash
# Run all apps in development mode (parallel)
pnpm dev

# Or run individual apps
pnpm dev:client    # Next.js frontend on http://localhost:3000
pnpm dev:api       # Express backend on http://localhost:5000
```

### Build

```bash
# Build everything
pnpm build

# Build individual packages
pnpm build:shared
pnpm build:client
pnpm build:api
```

## 📦 Packages

### `@family-games/shared`

Shared TypeScript types, Zod validation schemas, and utilities used by both client and API.

```typescript
// Import types
import { User, Room, SpadesData, DominoesData } from "@shared/types";

// Import validation
import { validatePlayerName, PlayerNameSchema } from "@shared/validation";

// Import utilities
import { HttpError, notFound, badRequest } from "@shared/utils";

// Import constants
import { TEAM_COLORS, DEFAULT_SPADES_SETTINGS } from "@shared/constants";
```

### `apps/client`

Next.js 15 frontend with:
- **App Router** for file-based routing
- **React 19** with Server Components
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible components
- **Socket.IO Client** for real-time communication
- **Turbopack** for fast development builds

### `apps/api`

Express 5 backend with:
- **Socket.IO** for WebSocket connections
- **TypeScript** with strict mode
- **Modular game architecture** - easy to add new games
- **Zod validation** for request validation
- **Centralized error handling**

## 🎮 Available Games

| Game | Players | Teams | Status |
|------|---------|-------|--------|
| **Spades** | 4 | 2×2 | ✅ Complete |
| **Dominoes** | 4 | Individual/Team | ✅ Complete |
| **Left-Right-Center** | 3-8 | Individual | 🚧 In Progress |

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm build:shared` | Build only the shared package |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm clean` | Remove build artifacts |

## 🌐 Deployment

### Frontend (Vercel)

The client is configured for Vercel deployment via `vercel.json`:

```bash
# Deploy to Vercel
vercel deploy
```

### Backend (Render)

The API is configured for Render deployment via `render.yaml`:

1. Connect your GitHub repo to Render
2. Render will auto-detect the `render.yaml` configuration
3. Deploy!

## 🛠️ Tech Stack

### Frontend
- [Next.js 15](https://nextjs.org/) - React framework
- [React 19](https://react.dev/) - UI library
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Socket.IO Client](https://socket.io/) - Real-time communication
- [Lucide React](https://lucide.dev/) - Icons

### Backend
- [Express 5](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - WebSocket server
- [Zod 4](https://zod.dev/) - Schema validation
- [TypeScript 5.5](https://www.typescriptlang.org/) - Type safety

### Tooling
- [pnpm](https://pnpm.io/) - Fast, disk-efficient package manager
- [Turbopack](https://turbo.build/pack) - Fast bundler for Next.js
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting

## 📝 Environment Variables

### Client (`apps/client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

### API (`apps/api/.env`)

```env
PORT=5000
NODE_ENV=development
ROOM_EMPTY_TTL_SECONDS=300
RECONNECT_TIMEOUT_MINUTES=2
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and not licensed for public use.

---

Built with ❤️ for family game nights
