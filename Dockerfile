FROM python:3.11-slim

# Set working directory & environment variables
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies for compilation & PostgreSQL adapters
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code, datasets, and ML models
COPY . .

# Expose backend API port
EXPOSE 8000

# Seed database tables and start FastAPI uvicorn server
CMD ["sh", "-c", "python scripts/seed_database.py && uvicorn main:app --host 0.0.0.0 --port 8000"]