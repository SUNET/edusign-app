FROM centos:centos7

RUN yum -y update \
    && yum -y install httpd mod_ssl mod_ldap

RUN yum reinstall glibc-common -y && \
  localedef -c -i en_US -f UTF-8 en_US.UTF-8 && \
  echo "LANG=en_US.UTF-8" > /etc/locale.conf

ENV LANG en_US.UTF-8

RUN yum -y clean all

COPY httpd-foreground /usr/local/bin/
COPY etc-httpd/ /etc/httpd/
COPY var-www-html/ /var/www/html/

RUN chmod +x /usr/local/bin/httpd-foreground

EXPOSE 80 443

CMD ["httpd-foreground"]
