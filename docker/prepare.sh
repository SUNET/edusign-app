#!/bin/sh

if [ ! -f docker-compose.yml ]; then
    echo "Run $0 from the edusign-integration/docker directory"
    exit 1
fi

#
# Set up entrys in /etc/hosts for the containers with externally accessible services
# DON'T USE THE edusign_dev ONES, COOKIES ARE SCOPED FOR edusign.docker
#
(printf "172.20.10.200\tidptestbed\n";
printf "172.20.10.203\tsp.edusign.docker\n";
printf "172.20.10.204\twww.edusign.docker\n";
) \
    | while read line; do
    if ! grep -q "^${line}$" /etc/hosts; then
	echo "$0: Adding line '${line}' to /etc/hosts"
	if [ "x`whoami`" = "xroot" ]; then
	    echo "${line}" >> /etc/hosts
	else
	    echo "${line}" | sudo tee -a /etc/hosts
	fi
    else
	echo "Line '${line}' already in /etc/hosts"
    fi
done
