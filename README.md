# 🚀 Gyaanzo Quiz & Mock Test Backend API

High-performance, scalable NestJS backend supporting **Gyaanzo** – an advanced competitive exam preparation app featuring real-time daily streaks, Skill Points (SP) digital wallet, topic-level mock tests, community discussions, and syllabus practice.

---

## 🛠️ Technology Stack

* **Framework:** [NestJS 11](https://nestjs.com/) (Express platform)
* **Language:** TypeScript 5
* **Database:** PostgreSQL hosted on [Supabase](https://supabase.com/) with connection pooling
* **ORM:** [TypeORM 0.3](https://typeorm.io/)
* **Authentication:** Google OAuth2 + JWT Sessions (`@nestjs/jwt`, `passport-jwt`)
* **Caching & High Performance:** [Redis](https://redis.io/) via `ioredis` with safe offline fallback
* **Cloud Storage:** AWS S3 (SDK v3) with Presigned URLs and Base64 upload support

---

## ⚙️ Environment Variables Configuration (`.env`)

```env
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://zidtnptmywhdizjnfcvy.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...

# Google OAuth Credentials
GOOGLE_CLIENT_ID=524746447996-...apps.googleusercontent.com

# Database Connection (Supabase PostgreSQL pooler)
DATABASE_URL="postgresql://postgres.zidtnptmywhdizjnfcvy:...@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# JWT Authentication
JWT_SECRET=gyaanzo_super_secure_jwt_secret_key_2026_xyz987
JWT_EXPIRES_IN=30d

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3 Storage
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=selfsync-development-files-009929032530-ap-south-1-an

# Rewards
MOCK_TEST_SP_REWARD_PER_QUESTION=1
```

---

## 🧭 Complete Controller & Endpoint Reference

### 1. App Controller (`/`)
File: `src/app.controller.ts`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check & welcome message | No |

---

### 2. Authentication Controller (`/auth`)
File: `src/auth/controllers/auth.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/google` | Google sign-in & automatic user creation in Supabase. Issues 30-day JWT token and auto-initializes wallet. | `{ idToken: string, email: string, fullName?: string, avatarUrl?: string }` |
| `GET` | `/auth/login/:token` | Token login exchange | URL Param: `token` |
| `GET` | `/auth/me` | Fetches the authenticated user profile from token | Header: `Authorization: Bearer <accessToken>` |

---

### 3. Dashboard, Exams & Mock Tests Controller (`/dashboard`)
File: `src/dashboard/controllers/dashboard.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/:userId` | Retrieves home dashboard summary (user profile, daily streak, and wallet details) | URL Param: `userId` (UUID or email) |
| `GET` | `/dashboard/exams/list` | Returns list of target exams (Bank PO, Bank Clerk, etc.), cached in Redis for 1 hour | None |
| `GET` | `/dashboard/exams/subjects/:examId` | Returns subjects associated with an exam along with active test counts | URL Param: `examId` |
| `GET` | `/dashboard/subject/topics/:subjectId` | Returns all syllabus topics belonging to a subject | URL Param: `subjectId` |
| `GET` | `/dashboard/topic-tests/:topicId` | Returns mock tests specific to a topic (`scope = 'topic'`) | URL Param: `topicId` |
| `GET` | `/dashboard/tests/:testId` | Returns comprehensive test details including question bank questions, difficulty, and multiple-choice options | URL Param: `testId` |

---

### 4. User & Profile Controller (`/user`)
File: `src/user/controllers/user.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/user/all-users` | Lists registered platform users | None |
| `GET` | `/user/profile/:userId` | Retrieves full user profile information | URL Param: `userId` |
| `GET` | `/user/check-username/:username` | Validates if a username is available | URL Param: `username` |
| `POST` | `/user/setup-profile` | Updates user profile (exam interest, phone, qualification, language, bio) | Body: `{ userId, examInterest, phone, ... }` |
| `GET` | `/user/database-exams` | Fetches active competitive exams list | None |
| `GET` | `/user/discussions` | Retrieves community discussion posts | Query: `?category=All&sort=Top` |
| `POST` | `/user/discussions` | Publishes a new discussion post | Body: `{ title, content, author_name, ... }` |
| `POST` | `/user/discussions/:id/vote` | Upvotes or downvotes a discussion post | URL Param: `id`, Body: `{ delta: 1 }` |
| `POST` | `/user/upload` | Uploads base64 encoded media to AWS S3 | Body: `{ fileData: string, fileName: string, mimeType?: string, folder?: string }` |
| `POST` | `/user/presigned-upload-url` | Generates a direct presigned PUT URL for AWS S3 upload | Body: `{ fileName: string, mimeType?: string, folder?: string }` |

---

### 5. Daily Streak Controller (`/streak`)
File: `src/user/controllers/streak.controller.ts`

Adheres strictly to **Indian Standard Time (IST: UTC+05:30)** calendar dates.

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/streak/:userId` | Retrieves current streak days, longest streak, and whether today's visit has been recorded | URL Param: `userId` (UUID, email, or token) |
| `POST` | `/streak` | Records daily streak visit. Checks consecutive calendar days in IST, increments streak, updates longest streak, and credits daily bonus SP to wallet. | Body: `{ userId: string }` |
| `GET` | `/streak/logs/:userId` | Returns monthly streak calendar activity logs with SP bonus history | URL Param: `userId` |

---

### 6. Skill Bank Wallet Controller (`/wallet`)
File: `src/wallet/controllers/wallet.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/wallet/info/:userId` | Returns user's Skill Bank account (`balance_sp`, `total_earned_sp`, `total_withdrawn_sp`) and recent transactions | URL Param: `userId`, Query: `?limit=10&page=0` |
| `GET` | `/wallet/transactions/:bankId` | Paginated transaction history for a specific bank account | URL Param: `bankId`, Query: `?limit=10&page=1` |

---

### 7. Daily Quiz Controller (`/quiz`)
File: `src/quiz/controllers/quiz.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/quiz/today` | Returns all active quizzes scheduled for today's date | None |
| `GET` | `/quiz/:quizId/questions` | Returns a quiz along with its ordered question set | URL Param: `quizId` |

---

### 8. Community Controller (`/community`)
File: `src/community/controllers/community.controller.ts`

| Method | Endpoint | Description | Request Body / Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/community/create` | Creates a new post with multipart file attachments (up to 10 files) | Multipart form-data |
| `GET` | `/community/posts` | Paginated list of community posts | Body: `{ limit, page }` |
| `PATCH` | `/community/update/:postId` | Updates an existing community post | URL Param: `postId`, Multipart form-data |
| `PATCH` | `/community/post/upvote/:postId` | Toggles post upvote | URL Param: `postId`, Body: `{ userId: string }` |
| `GET` | `/community/post/comments/:postId` | Lists comments for a post | URL Param: `postId`, Body: `{ limit, page }` |
| `GET` | `/community/post/comments-replies/:postId/:parentCommentId` | Lists replies to a nested comment | URL Params: `postId`, `parentCommentId` |
| `POST` | `/community/post/comments/:postId` | Adds a comment or nested reply | URL Param: `postId`, Body: `{ userId, comment, parentCommentId? }` |

---

## 📚 Complete Curriculum & Topic Hierarchy

This standardized curriculum tree is mapped across subjects, modules, topics, and mock tests:

```json
{
  "Quantitative Aptitude & Data Analysis": {
    "Data Interpretation": {
      "topics": [
        "Bar Graphs",
        "Line Graphs",
        "Pie Charts",
        "Tabular DI",
        "Radar/Web Charts",
        "Caselets (Paragraph-Based DI)"
      ]
    },
    "Number System & Algebra": {
      "topics": [
        "Simplification & Approximation",
        "BODMAS",
        "Square Roots & Cube Roots",
        "Number Series",
        "Missing Number Series",
        "Wrong Number Series",
        "Quadratic Equations"
      ]
    },
    "Arithmetic (Word Problems)": {
      "topics": [
        "Percentage",
        "Ratio & Proportion",
        "Average",
        "Profit, Loss & Discount",
        "Simple Interest",
        "Compound Interest",
        "Time & Work",
        "Pipes & Cisterns",
        "Speed, Distance & Time",
        "Trains",
        "Boats & Streams",
        "Mixture & Alligation",
        "Partnership",
        "Probability",
        "Permutation & Combination",
        "Mensuration"
      ]
    },
    "Data Sufficiency": {
      "topics": [
        "Mathematical Data Sufficiency",
        "Statement-Based Data Sufficiency",
        "Two-Statement Data Sufficiency",
        "Multiple-Statement Data Sufficiency"
      ]
    }
  },
  "Reasoning Ability": {
    "Puzzles & Seating Arrangement": {
      "topics": [
        "Linear Seating Arrangement",
        "Double Row Seating Arrangement",
        "Circular Seating Arrangement",
        "Square Seating Arrangement",
        "Rectangular Seating Arrangement",
        "Floor-Based Puzzles",
        "Flat-Based Puzzles",
        "Scheduling Puzzles",
        "Days-Based Puzzles",
        "Months-Based Puzzles",
        "Years-Based Puzzles",
        "Box-Based Puzzles"
      ]
    },
    "Core Logic": {
      "topics": [
        "Syllogism",
        "Only a Few / Reverse Syllogism",
        "Inequalities",
        "Coded Inequalities",
        "Blood Relations",
        "Coded Blood Relations",
        "Direction & Distance",
        "Order & Ranking"
      ]
    },
    "Alphanumeric Series & Coding": {
      "topics": [
        "Letter Series",
        "Number Series",
        "Alphanumeric Series",
        "Coding-Decoding",
        "Chinese Coding",
        "Sentence Coding",
        "New Pattern Coding"
      ]
    },
    "Machine Input-Output": {
      "topics": [
        "Step-by-Step Input-Output",
        "Number Rearrangement",
        "Word Rearrangement",
        "Mixed Input-Output",
        "Pattern-Based Input-Output"
      ]
    },
    "Logical/Critical Reasoning": {
      "topics": [
        "Statement & Assumption",
        "Statement & Conclusion",
        "Cause & Effect",
        "Course of Action",
        "Strengthening Arguments",
        "Weakening Arguments"
      ]
    }
  },
  "English Language": {
    "Reading Comprehension": {
      "topics": [
        "Inference-Based Questions",
        "Main Theme / Central Idea",
        "Author's Tone",
        "Vocabulary in Context",
        "Fact-Based Questions",
        "Conclusion-Based Questions"
      ]
    },
    "Grammar & Sentence Structure": {
      "topics": [
        "Error Spotting",
        "Sentence Correction",
        "Phrase Replacement",
        "Single Fillers",
        "Double Fillers",
        "Word Swap"
      ]
    },
    "Paragraph Logic": {
      "topics": [
        "Cloze Test",
        "Para Jumbles",
        "Paragraph Completion",
        "Sentence Connectors"
      ]
    }
  },
  "General, Economy & Banking Awareness": {
    "Current Affairs": {
      "topics": [
        "National Current Affairs",
        "International Current Affairs",
        "Government Schemes",
        "Appointments",
        "Awards",
        "Reports & Indexes",
        "Last 6 Months Current Affairs"
      ]
    },
    "Banking & Economy": {
      "topics": [
        "Reserve Bank of India (RBI) Functions",
        "Monetary Policy",
        "Repo Rate",
        "Cash Reserve Ratio (CRR)",
        "Statutory Liquidity Ratio (SLR)",
        "Inflation",
        "GDP",
        "Union Budget",
        "Economic Survey",
        "Non-Performing Assets (NPA)",
        "Types of Bank Accounts",
        "BASEL Norms",
        "NEFT",
        "RTGS",
        "UPI"
      ]
    },
    "Digital/Financial Awareness & RBI Circulars": {
      "topics": [
        "API Banking",
        "Blockchain",
        "Cybersecurity",
        "Financial Inclusion Schemes",
        "Bonds",
        "Mutual Funds",
        "Recent RBI Circulars"
      ]
    },
    "Static GK": {
      "topics": [
        "Bank Headquarters",
        "Bank Taglines",
        "International Financial Organizations",
        "International Monetary Fund (IMF)",
        "World Bank",
        "Banking Acts",
        "Banking Regulation Act",
        "SARFAESI Act",
        "Important Banking Committees"
      ]
    }
  }
}
```

---

## 🏃‍♂️ Running Locally

```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Run production build
npm run build
npm run start:prod
```
