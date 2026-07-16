FROM debian:11

MAINTAINER eperez@emergya.com

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get -y update && apt-get -y upgrade && \
    apt-get -y install libffi-dev libfreetype6-dev libjpeg62-turbo-dev libssl-dev \
      libtiff5-dev libxml2-dev libxml2-utils libxslt1-dev swig xmlsec1 zlib1g-dev \
      git build-essential libpython3-dev python3-cffi python3-venv iputils-ping \
      procps bind9-host netcat-openbsd net-tools curl locales && \
    apt-get -y clean

RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

RUN mkdir -p /opt/edusign
WORKDIR /opt/edusign

# uv manages the virtualenv and the python interpreter (the debian:11 system
# python is too old for the locked dependency set; uv fetches the CPython
# pinned in .python-version).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

RUN addgroup --system edusign
RUN adduser --system --shell /bin/false edusign

RUN mkdir -p /var/log/edusign
RUN chown -R edusign: /var/log/edusign
RUN chmod -R 770 /var/log/edusign

RUN mkdir -p /opt/edusign/run
RUN chown -R edusign: /opt/edusign/run
RUN chmod -R 770 /opt/edusign/run

ADD . /opt/edusign/edusign-webapp

WORKDIR /opt/edusign/edusign-webapp

# Create the venv at /opt/edusign (same location the old python -m venv used)
# with the locked dependencies and the project installed editable (the uv
# equivalent of the old `setup.py develop`). pip is seeded into the venv
# because start.sh runs `pip freeze` for the startup log.
ENV UV_PROJECT_ENVIRONMENT=/opt/edusign
RUN uv sync --frozen --no-dev
RUN uv pip install pip gunicorn

ADD ./scripts/start.sh /start.sh

EXPOSE 8080

CMD ["bash", "/start.sh"]
