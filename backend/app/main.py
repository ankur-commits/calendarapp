from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import events, voice, users, auth, assistant, shopping, todos
from dotenv import load_dotenv

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Family Calendar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(voice.router, prefix="/api/voice", tags=["voice"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(shopping.router, prefix="/api/shopping", tags=["shopping"])
app.include_router(todos.router, prefix="/api/todos", tags=["todos"])
from .routes import families
app.include_router(families.router, prefix="/api/families", tags=["families"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Family Calendar API"}
