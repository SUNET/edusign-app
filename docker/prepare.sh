#!/bin/sh

if [ ! -f docker-compose.yml ]; then
    echo "Run $0 from the edusign-integration/docker directory"
    exit 1
fi

#
# Set up entrys in /etc/hosts for the containers with externally accessible services
# DON'T USE THE edusign_dev ONES, COOKIES ARE SCOPED FOR edusign.docker
#
(printf "172.18.10.200\thtml.edusign_dev html.edusign.docker\n";
printf "172.18.10.201\tidp.edusign_dev idp.edusign.docker\n";
printf "172.18.10.202\tsp.edusign_dev sp.edusign.docker\n";
printf "172.18.10.203\twww.edusign_dev sp.edusign.docker\n";
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
