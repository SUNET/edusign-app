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

RUN python3 -m venv /opt/edusign
RUN /opt/edusign/bin/pip install -U pip wheel

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

RUN /opt/edusign/bin/pip install -r /opt/edusign/edusign-webapp/requirements.txt
RUN /opt/edusign/bin/python /opt/edusign/edusign-webapp/setup.py develop
RUN /opt/edusign/bin/pip install gunicorn

ADD ./scripts/start.sh /start.sh

EXPOSE 8080

CMD ["bash", "/start.sh"]
