FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend

# Create static directory for logos
RUN mkdir -p static/logos

# Expose port for Hugging Face
EXPOSE 7860

# Run the app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
