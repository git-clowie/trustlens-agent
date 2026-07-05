# Use a lightweight python base image
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# Copy python dependency metadata
COPY requirements.txt pyproject.toml README.md ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source, backend, and static web files
COPY src/ ./src/
COPY backend/ ./backend/
COPY web/dist/ ./web/dist/
COPY .env.example .env

# Install TrustLens as a package so CLI and MCP module commands work in the image
RUN pip install --no-cache-dir --no-deps -e .

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000

# Command to start the FastAPI server
CMD ["python", "backend/run.py"]
