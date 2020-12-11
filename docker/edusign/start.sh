#!/bin/sh


/etc/init.d/shibd start


exec /usr/bin/supervisord
