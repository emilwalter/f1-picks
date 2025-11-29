# F1 Picks

A real-time Formula 1 prediction platform where users can create rooms, make race predictions, and compete with friends throughout the F1 season.

## Features

- **Room-Based Predictions**: Create or join rooms for an entire F1 season
- **Race Predictions**: Predict driver positions, fastest lap, pole position, and DNFs
- **Real-Time Updates**: Live leaderboards and room updates powered by Convex
- **Flexible Lockout System**: Configure when predictions lock (before sessions, custom time offsets)
- **Custom Scoring**: Configurable scoring systems with position points, bonuses, and penalties
- **Race Data Sync**: Automatic synchronization with OpenF1 API for race schedules and results
- **Dark Mode**: Beautiful dark theme optimized for F1 viewing
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16+ (App Router, React Server Components)
- **Backend & Database**: Convex (real-time database, reactive queries)
- **Authentication**: Clerk
- **UI Components**: shadcn/ui (Radix-based, New York style)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Package Manager**: pnpm
- **Language**: TypeScript (strict mode)
- **Race Data**: OpenF1 API

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm installed
- A Convex account (sign up at [convex.dev](https://convex.dev))
- A Clerk account (sign up at [clerk.com](https://clerk.com))

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd f1-picks
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up Convex:

```bash
pnpm convex:dev
```

This will prompt you to create a new Convex project or link to an existing one. Follow the prompts.

4. Set up environment variables:
   Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
```

5. Configure Convex environment variables:
   Set up your Clerk keys in Convex dashboard or via CLI:

```bash
npx convex env set CLERK_SECRET_KEY <your-clerk-secret-key>
```

6. Run the development server:

```bash
pnpm dev
```

7. In another terminal, run Convex dev:

```bash
pnpm convex:dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
app/                    # Next.js App Router pages
├── layout.tsx         # Global layout, theme, navbar
├── page.tsx           # Dashboard (active rooms, create/join)
├── races/[raceId]/    # Race details and information
└── rooms/[roomId]/    # Room view: predictions, leaderboard, participants
    ├── participants/  # Room participants list
    ├── predictions/   # Prediction management
    └── results/       # Race results and scoring

convex/                 # Convex backend functions
├── schema.ts          # Data model definitions
├── queries/           # Read-only reactive queries
├── mutations/         # Write operations
├── actions/           # External API calls (OpenF1)
│   ├── openf1.ts      # OpenF1 API integration
│   └── raceSync.ts    # Race result synchronization
├── lib/               # Shared utilities
│   ├── scoring.ts     # Scoring calculation logic
│   ├── lockout.ts     # Lockout validation logic
│   └── userHelpers.ts # User utility functions
└── crons.js           # Scheduled functions

components/             # React components
├── ui/                # shadcn/ui components
├── dashboard/         # Dashboard components
├── room/              # Room-related components
└── race/              # Race-related components

lib/                    # Utilities and shared code
hooks/                  # Custom React hooks
```

## Key Concepts

### Rooms

Rooms are season-long prediction groups. Each room:

- Is tied to a specific F1 season
- Has a host who can configure settings
- Uses a join code for easy access
- Has configurable lockout and scoring rules

### Predictions

Users make predictions for each race in a room:

- **Driver Positions**: Predict the finishing order (top 10)
- **Fastest Lap**: Predict which driver will set the fastest lap
- **Pole Position**: Predict qualifying winner
- **DNFs**: Predict which drivers will not finish

### Lockout System

Predictions lock at configurable times:

- Before a specific session starts (FP1, FP2, FP3, Qualifying, Race)
- Before a session ends
- Custom hours before race start

### Scoring

Points are awarded based on:

- **Position Points**: Configurable points for correct position predictions
- **Fastest Lap Bonus**: Points for correct fastest lap prediction
- **Pole Position Bonus**: Points for correct pole position prediction
- **DNF Penalty**: Negative points for incorrect DNF predictions

## Development

### Available Scripts

- `pnpm dev` - Start Next.js development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm convex:dev` - Start Convex development mode
- `pnpm convex:deploy` - Deploy Convex functions

### Code Style

- TypeScript strict mode enabled
- Prettier for code formatting (runs on save via lint-staged)
- ESLint for linting
- Husky for git hooks

### Convex Development

Convex functions are automatically synced when you run `pnpm convex:dev`. The Convex dashboard provides:

- Real-time function logs
- Database browser
- Function testing interface

Access the dashboard at the URL provided when you run `convex:dev`.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Deploy

### Convex Production

Deploy Convex functions to production:

```bash
pnpm convex:deploy --prod
```

Set production environment variables in Convex dashboard or via CLI.

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure code passes linting and formatting
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
