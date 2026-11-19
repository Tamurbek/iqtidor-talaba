FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TZ=Asia/Tashkent

WORKDIR /app

# Install system dependencies needed for compiling psycopg2 and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Windows'da tahrirlangan bo'lsa CRLF ni olib tashlash + bajariladigan qilish
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh \
    && mkdir -p /app/app/static/uploads

# Expose FastAPI port
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/docs > /dev/null || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]

# --proxy-headers: nginx'dan kelgan X-Forwarded-Proto (https) ni hisobga olish
#   (Secure cookie va to'g'ri redirect URL'lari uchun). Port faqat 127.0.0.1 ga
#   ochilgani sababli forwarded-allow-ips="*" xavfsiz.
# Workerlar soni 1: APScheduler har workerda alohida ishga tushadi, ko'p worker
#   bo'lsa rejalashtirilgan vazifalar (bildirishnomalar, hisobotlar) takrorlanadi.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--workers", "1"]
