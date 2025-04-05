FROM python:3.11-slim as requirements-stage

WORKDIR /tmp

# Install Poetry
RUN pip install poetry

# Copy pyproject.toml and poetry.lock* files
COPY ./pyproject.toml ./poetry.lock* /tmp/

# Generate requirements.txt
RUN poetry export --format requirements.txt --output requirements.txt --without-hashes

# Base image
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY --from=requirements-stage /tmp/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy project
COPY . /app/

# Run command
CMD ["uvicorn", "splitsphere.main:app", "--host", "0.0.0.0", "--port", "8000"]
