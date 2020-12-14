FROM debian:buster

MAINTAINER eperez@emergya.com

RUN apt update && apt upgrade -y && \
    apt install -y  opensaml2-schemas opensaml2-tools xmltooling-schemas libshibsp8 \
        libshibsp-plugins shibboleth-sp2-common shibboleth-sp2-utils procps curl git && \
    apt install -y build-essential fakeroot libpcre3 libpcre3-dev libpcrecpp0v5 libssl-dev \
    openssl zlib1g-dev tar gzip apt-utils mercurial

RUN /usr/sbin/shib-keygen

RUN touch /etc/apt/sources.list.d/nginx.list
RUN echo "deb http://nginx.org/packages/debian/ buster nginx" >> /etc/apt/sources.list.d/nginx.list
RUN echo "deb-src http://nginx.org/packages/debian/ buster nginx" >> /etc/apt/sources.list.d/nginx.list

WORKDIR /opt
RUN curl -OL  http://nginx.org/keys/nginx_signing.key
RUN apt-key add nginx_signing.key

RUN touch /etc/apt/preferences.d/nginx
RUN echo "Package: nginx" >> /etc/apt/preferences.d/nginx
RUN echo "Pin: release o=nginx" >> /etc/apt/preferences.d/nginx
RUN echo "Pin-Priority: 600" >> /etc/apt/preferences.d/nginx

RUN apt update

RUN apt install -y nginx

RUN curl -OL http://hg.nginx.org/pkg-oss/archive/tip.tar.gz
RUN tar -xzvf tip.tar.gz
RUN mv pkg-* tip

RUN apt install -y wget libxml2-utils xsltproc lsb-release devscripts quilt

RUN ./tip/build_module.sh -v 1.18.0 https://github.com/nginx-shib/nginx-http-shibboleth.git
RUN mv build-module-artifacts/nginx-module-shibboleth_1.18.0-1~buster_amd64.deb .
RUN rm -rf build-module-artifacts
RUN ./tip/build_module.sh -v 1.18.0 https://github.com/openresty/headers-more-nginx-module.git
RUN mv build-module-artifacts/nginx-module-headersmore_1.18.0-1~buster_amd64.deb .
RUN rm -rf build-module-artifacts
RUN dpkg -i nginx-module-shibboleth_1.18.0-1~buster_amd64.deb nginx-module-headersmore_1.18.0-1~buster_amd64.deb

RUN apt install -y supervisor

RUN mkdir -p /var/run/shibboleth

COPY ./config-current/nginx.conf /etc/nginx/
COPY ./config-current/shib_fastcgi_params /etc/nginx/
COPY ./config-current/shib_clear_headers /etc/nginx/
COPY ./config-current/fastcgi.conf /etc/nginx/

COPY ./config-current/supervisord.conf /etc/supervisor/conf.d/

RUN mkdir /etc/nginx/ssl/

COPY ./config-current/ssl/nginx.* /etc/nginx/ssl/

COPY ./config-current/shibboleth2.xml /etc/shibboleth/
COPY ./config-current/attribute-map.xml /etc/shibboleth/
COPY ./config-current/idp-metadata.xml /etc/shibboleth/

COPY start.sh /opt/

CMD ["/opt/start.sh"]
