FROM python:3.12-slim

RUN pip install --no-cache-dir flask

COPY app.py /opt/fake-api/app.py

EXPOSE 8080

CMD ["python", "/opt/fake-api/app.py"]
