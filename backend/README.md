# SplitSphere Backend

FastAPI backend for the SplitSphere expense splitting application.

## Current Status

This backend is currently a placeholder and under development. The frontend is operating in a local-only mode with IndexedDB storage.

## Setup (For Development)

1. Install dependencies:
   ```bash
   poetry install
   ```

2. Create a `.env` file with your configuration (see `.env.example`).

3. Run migrations (when database models are implemented):
   ```bash
   poetry run alembic upgrade head
   ```

4. Start the development server:
   ```bash
   poetry run uvicorn splitsphere.main:app --reload
   ```

## API Documentation

Once the server is running, you can access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

### Creating a Migration

After modifying models, create and run a migration:

```bash
poetry run alembic revision --autogenerate -m "Description of changes"
poetry run alembic upgrade head
```

## Planned Features

- User authentication and management
- Expense creation and management
- Group management
- Friends management
- Settlement calculations
- Multi-currency support
- Data synchronization with offline clients
- AI-powered transaction processing API
- Receipt OCR service integration
- Push notifications
- Email notifications and reminders
- Export data to various formats
- Analytics and expense reporting