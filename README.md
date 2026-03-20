# Books & Friends

**Books & Friends** is a cross-platform (Web + Mobile) application designed for collaborative reading. It allows users to create reading sessions for specific books, track their chapter-by-chapter progress, and engage in real-time discussions with other participants.

## 🚀 Key Features

- **Authentication**: Secure sign-up and sign-in via Supabase Auth.
- **Reading Sessions**: Create public sessions by specifying book title, author, and total chapters.
- **Progress Tracking**: Visualize your progress and see others' progress via chapter-based progress bars.
- **Real-time Discussion**: Flat discussion threads per session with instant updates.
- **Emoji Reactions**: React to comments with multiple emojis to express your thoughts.
- **Internationalization**: Full support for **English** and **Burmese** languages.

## 🛠 Tech Stack

### Backend
- **Supabase**: Handles Authentication, PostgreSQL Database, and Real-time subscriptions.

### Web (Frontend)
- **React**: UI library.
- **TypeScript**: Type safety.
- **Vite**: Fast development server and build tool.
- **Tailwind CSS**: Utility-first styling.
- **i18next**: Internationalization framework.

### Mobile (Mobile App)
- **React Native**: Cross-platform mobile framework.
- **Expo**: Framework and platform for universal React applications.
- **Expo Router**: File-based routing for React Native.
- **TypeScript**: Type safety.

## 📂 Project Structure

```text
.
├── Mobile/               # Expo-based React Native mobile application
│   ├── app/              # Expo Router pages (tabs, auth, sessions)
│   ├── components/       # Shared UI components
│   ├── hooks/            # Custom React hooks (AuthProvider, etc.)
│   └── lib/              # Library configurations (Supabase client)
├── Web/                  # Vite-based React web application
│   ├── src/
│   │   ├── auth/         # Authentication logic and providers
│   │   ├── components/   # UI components (shadcn-like)
│   │   ├── pages/        # Application pages (Home, Session, etc.)
│   │   ├── lib/          # Supabase client and utilities
│   │   └── locales/      # Translation files (en, my)
│   └── supabase/         # Backend schema and seed scripts
└── PROJECT_SPEC.md       # Original project specification
```

## 🏁 Getting Started

### 1. Supabase Setup
Ensure your Supabase project is configured with the required tables and Row Level Security (RLS) policies.
- Run the SQL scripts found in `Web/supabase/schema_v1.sql` in your Supabase SQL Editor.
- (Optional) Run `Web/supabase/seed_v1.sql` to populate initial data.

### 2. Web Application
1. Navigate to the `Web` directory: `cd Web`
2. Install dependencies: `npm install`
3. Configure environment variables:
   - Copy `.env.example` to `.env`.
   - Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Start development server: `npm run dev`

### 3. Mobile Application
1. Navigate to the `Mobile` directory: `cd Mobile`
2. Install dependencies: `npm install`
3. Configure Expo:
   - Ensure you have the Expo Go app on your phone or an emulator.
4. Start the development server: `npx expo start`

---

Built with ❤️ for book lovers.
