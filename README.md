# CampusGig

A student task marketplace where university students can post tasks, earn money, and help each other out — all within their campus community.

## Features

- **Passwordless Auth** - Sign in with your .edu email using OTP codes
- **Task Marketplace** - Post and browse tasks (moving, tutoring, errands, tech help, etc.)
- **In-App Messaging** - Chat directly with task posters/helpers
- **Review System** - Rate and review other students after task completion
- **University Filtering** - Only see tasks from students at your school
- **Safety Features** - Block/report users, content moderation

## Tech Stack

- **Frontend**: React 18, React Router, Lucide Icons
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Email**: Brevo SMTP / Resend / Gmail

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- SMTP credentials (Brevo free tier recommended)

### 1. Clone and Install

```bash
git clone https://github.com/KaushikSriram/campus-gigs.git
cd campus-gigs

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run `backend/supabase-setup.sql`
3. Run `backend/email-otp-migration.sql`
4. Copy your project URL and anon key from Settings > API

### 3. Configure Environment

Create `backend/.env`:

```env
JWT_SECRET=your-secure-secret-here
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Email (pick one option)
# Option 1: Brevo SMTP (recommended, free tier)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-brevo-smtp-user
SMTP_PASS=your-brevo-smtp-key
EMAIL_FROM=CampusGig <your-email@domain.com>

# Option 2: Gmail
# GMAIL_USER=your-gmail@gmail.com
# GMAIL_APP_PASSWORD=your-16-char-app-password

# Option 3: Resend
# RESEND_API_KEY=re_xxxxx
```

### 4. Run Locally

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Connect repo on [render.com](https://render.com)
3. Create a Web Service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables (see `.env.example`)

### Frontend (Vercel)

1. Import project on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   - `REACT_APP_API_URL=https://your-backend.onrender.com/api`

### One-Click Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## Project Structure

```
campus-gigs/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── database.js        # Supabase client
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth middleware
│   │   ├── services/          # Email, notifications
│   │   └── utils/             # Helpers
│   ├── supabase-setup.sql     # Database schema
│   └── email-otp-migration.sql
├── frontend/
│   ├── src/
│   │   ├── App.js             # Router setup
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable UI
│   │   ├── context/           # Auth context
│   │   └── utils/             # API client, helpers
│   └── public/
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/send-code` - Send OTP to email
- `POST /api/auth/verify-code` - Verify OTP and login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Tasks
- `GET /api/tasks` - List campus tasks
- `GET /api/tasks/:id` - Task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Cancel task
- `POST /api/tasks/:id/interest` - Express interest
- `POST /api/tasks/:id/complete` - Mark complete

### Messages
- `GET /api/messages/threads` - List conversations
- `GET /api/messages/:taskId/:userId` - Get messages
- `POST /api/messages/:taskId/:userId` - Send message

### Reviews
- `POST /api/reviews` - Submit review
- `GET /api/reviews/user/:userId` - User reviews
- `GET /api/reviews/pending` - Pending reviews

## Monetization Ideas

1. **Featured Listings** - Pay to boost task visibility
2. **Transaction Fees** - Small % on completed tasks
3. **Premium Accounts** - Priority support, analytics
4. **University Partnerships** - Licensing to schools

## Contributing

PRs welcome! Please open an issue first to discuss major changes.

## License

MIT
