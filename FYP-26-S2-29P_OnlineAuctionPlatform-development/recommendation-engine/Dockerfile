FROM python:3.12-slim

LABEL description="Auction platform Recommendation Engine"

WORKDIR /app

# Install build dependencies needed for scikit-surprise and other compiled packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV LOG_DIR=/logs

EXPOSE 8002

CMD ["python", "-m", "app.main"]