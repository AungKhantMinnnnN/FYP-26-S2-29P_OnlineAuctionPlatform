FROM python:3.12-slim

LABEL description="Auction platform Bidding Engine"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Tell logger.py where to write logs
ENV LOG_DIR=/logs

EXPOSE 8001

CMD ["python", "-m", "app.main"]