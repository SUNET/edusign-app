FROM debian:buster

MAINTAINER eperez@emergya.com

ENV DEBIAN_FRONTEND noninteractive

RUN /bin/sed -i s/deb.debian.org/ftp.se.debian.org/g /etc/apt/sources.list

RUN apt-get -y update && apt-get -y upgrade && \
    apt-get -y install libffi-dev libfreetype6-dev libjpeg62-turbo-dev libssl-dev \
      libtiff5-dev libxml2-dev libxml2-utils libxslt1-dev swig xmlsec1 zlib1g-dev \
      git build-essential libpython3-dev python3-cffi python3-venv iputils-ping \
      procps bind9-host netcat-openbsd net-tools curl && \
    apt-get -y clean

RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/edusign
WORKDIR /opt/edusign

RUN python3 -m venv /opt/edusign
RUN /opt/edusign/bin/pip install -U pip wheel

RUN addgroup --system edusign
RUN adduser --system --shell /bin/false edusign

RUN mkdir -p /var/log/edusign
RUN chown edusign: /var/log/edusign
RUN chmod 770 /var/log/edusign

ADD . /opt/edusign/edusign-webapp

WORKDIR /opt/edusign/edusign-webapp

RUN /opt/edusign/bin/python /opt/edusign/edusign-webapp/setup.py install

EXPOSE 8080

ADD ./scripts/start.sh /start.sh

CMD ["bash", "/start.sh"]
