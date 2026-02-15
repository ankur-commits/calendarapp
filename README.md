# FamilyCal

**FamilyCal** is an AI-powered family calendar application designed to streamline family organization. It allows users to manage events, shopping lists, chores, and to-dos using natural language text and voice commands.

## 🚀 Key Features

-   **AI Assistant**: Parse complex requests like "Soccer practice Tuesday at 5pm and remind me to buy milk" into key events and tasks using OpenAI GPT-4o and Gemini 2.0.
-   **Voice Commands**: One-tap voice input for adding events on the go, transcribed by OpenAI Whisper.
-   **Family Management**: Create or join family groups to share calendars and lists.
-   **Smart Logistics**:  Automatic drive time calculations and conflict detection.
-   **Event Discovery**: Search for real-world events (concerts, games) using Gemini with Google Search grounding.
-   **Cross-Platform**: Responsive design works seamlessly on desktop and mobile.

## 🛠 Tech Stack

### Frontend
-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS v4
-   **State/Data**: React Hooks, Axios
-   **Deployment**: Vercel

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12)
-   **Database**: PostgreSQL (Production), SQLite (Dev/Test)
-   **ORM**: SQLAlchemy with Alembic for migrations
-   **AI Models**: OpenAI (GPT-4o, Whisper), Google Gemini 2.0 Flash
-   **Deployment**: Railway

## 📋 Prerequisites

-   **Node.js**: v18+
-   **Python**: v3.12+
-   **PostgreSQL**: (Optional for local dev, SQLite is default)

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/ankur-commits/calendarapp.git
cd calendarapp
```

### 2. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set up environment variables:
Create a `.env` file in `backend/` with the following keys:
```ini
DATABASE_URL=sqlite:///./family_calendar.db
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
TICKETMASTER_API_KEY=your_tm_key
SECRET_KEY=your_secret_key
algorithm=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Run migrations and start the server:
```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`.

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Set up environment variables:
Create a `.env.local` file in `frontend/`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## 🧪 Testing

We have comprehensive testing guides available for both frontend and backend.

-   **Frontend Tests**: [Read the Frontend Testing Guide](frontend/TESTING_GUIDE.md)
    -   Run with: `npm test` (in `frontend/` dir)
-   **Backend Tests**: [Read the Backend Testing Guide](backend/TESTING_GUIDE.md)
    -   Run with: `pytest` (in `backend/` dir)

## 🚢 Deployment

The project is set up with a CI/CD pipeline:
-   **Staging**: Pushing to the `staging` branch triggers deployment to Railway (Backend) and Vercel (Frontend).
-   **Production**: Pushing to `main` triggers production deployment.

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed deployment topology.

## 📂 Project Structure

```
Calendar App/
├── backend/             # FastAPI backend
│   ├── app/             # Application source code
│   ├── alembic/         # Database migrations
│   └── tests/           # Pytest suite
├── frontend/            # Next.js frontend
│   ├── app/             # App Router pages
│   ├── components/      # Reusable UI components
│   └── tests/           # Vitest suite
└── ARCHITECTURE.md      # Detailed system architecture
```

## 📄 License

This project is proprietary and confidential. Only authorized users should access the code.
