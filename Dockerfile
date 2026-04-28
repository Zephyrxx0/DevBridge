FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API source code into the api module structure expected by imports
COPY api/ ./api/

# Set PYTHONPATH to root so `import api.x` works
ENV PYTHONPATH=/app

# Expose port (Cloud Run sets PORT, but this is documentation)
EXPOSE 8080

# Run the server
CMD ["python", "api/run_server.py"]
