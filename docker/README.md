# Local development environment

Runs the eduSign UI on your machine with a fake login and a fake
sign API. Every UI state is reachable; nothing leaves your machine.
Signed documents are not really signed. Design and limits:
dev-env-notes.md.

## Requirements

- Docker with the compose plugin.
- Node and npm for the frontend build.
- The docker-edusign-app repository checked out next to this one
  (`../docker-edusign-app`), for its `example-customization`
  directory.
- This line in `/etc/hosts`, since the session cookie is bound to
  that name:

      127.0.0.1 sp.edusign.docker

## Running

In one terminal, build the frontend and keep rebuilding on edits:

    make front-init
    make front-build-dev

In another, start the containers:

    make dev-env-start

Then open http://sp.edusign.docker/sign/ for the first user and
http://sp.edusign.docker/sign2/ for the second. The two can invite
each other. Use that name, not localhost: the session cookie is set
for it, and the browser drops it on any other host.

`make dev-env-stop` removes the containers. The fake API keeps its
documents in memory, so a restart empties them; the backend's sqlite
database and uploaded files live inside the `www` container and go
with it.

## Working on the UI

Edit under `frontend/src`; the watch build writes `frontend/build`,
which the sp container serves at `/js`. Reload the page.

Backend edits are picked up too: the backend source is mounted into
`www` and gunicorn reloads on change.

The page loads `/assets/custom.css`, which is `docker/custom.css`
here and empty. Put rules in it to try a site customization; the
logos and favicon come from docker-edusign-app's
`example-customization`.
