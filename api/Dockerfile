FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from api/ into /app/api/
COPY . ./api/

# Set PYTHONPATH so 'import api.x' works
ENV PYTHONPATH=/app

# Cloud Run uses PORT env var, but we'll expose 8080 as a hint
EXPOSE 8080

# Run the server via the helper script
CMD ["python", "api/run_server.py"]
