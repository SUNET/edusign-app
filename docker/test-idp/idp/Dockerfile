FROM unicon/shibboleth-idp:latest

MAINTAINER Unicon, Inc.

RUN yum update -y && \
  yum reinstall glibc-common -y && \
  localedef -c -i en_US -f UTF-8 en_US.UTF-8 && \
  echo "LANG=en_US.UTF-8" > /etc/locale.conf

ENV LANG en_US.UTF-8

RUN yum -y clean all

COPY shibboleth-idp/ /opt/shibboleth-idp/
COPY shib-jetty-base/ /opt/shib-jetty-base/
