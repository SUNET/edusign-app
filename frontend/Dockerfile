FROM debian:buster

MAINTAINER eperez@emergya.com

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get -y update && apt-get -y upgrade && \
    apt-get -y install npm
    apt-get -y clean

RUN npm install -U npm -g
RUN rm -rf /var/lib/apt/lists/*

ADD . /opt/frontend

WORKDIR /opt/frontend

CMD ["bash", "/opt/frontend/build.sh"]
