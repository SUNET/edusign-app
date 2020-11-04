#!/bin/sh

cp /opt/config/nginx.conf /etc/nginx/
cp /opt/config/shib_fastcgi_params /etc/nginx/
cp /opt/config/fastcgi.conf /etc/nginx/

cp /opt/config/supervisord.conf /etc/supervisor/conf.d/

cp -R /opt/config/ssl /etc/nginx/

exec /usr/bin/supervisord
