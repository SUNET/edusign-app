FROM debian:buster

MAINTAINER eperez@emergya.com

ENV DEBIAN_FRONTEND noninteractive

RUN apt -y update && apt -y upgrade && \
    apt -y install npm && \
    apt -y clean

RUN npm install -U npm -g
RUN rm -rf /var/lib/apt/lists/*

COPY . /opt/frontend

WORKDIR /opt/frontend

RUN npm install && npm run build-pro && rm -rf node_modules

ENTRYPOINT ["bash", "/opt/frontend/build.sh"]
