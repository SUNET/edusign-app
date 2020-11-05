FROM docker.sunet.se/eduid/python3env

MAINTAINER eperez@emergya.com

RUN apt-get update && \
    apt-get -y install libffi-dev libfreetype6-dev libjpeg62-turbo-dev libssl-dev \
      libtiff5-dev libxml2-dev libxml2-utils libxslt1-dev swig xmlsec1 zlib1g-dev

RUN apt-get clean

ADD . /opt/backend/

WORKDIR /opt/backend
RUN python setup.py install
