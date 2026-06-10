FROM python:3.12
RUN apt-get update
WORKDIR /app
EXPOSE 8000
COPY requirements.txt requirements.txt
RUN  pip install --upgrade pip
RUN pip install -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1