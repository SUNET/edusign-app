VERSIONS
========

Bump version in edusign-app
---------------------------

Bump version in backend/setup.py

Bump version in frontend/package.json

Commit and push

Create (named, signed) tag with version as name (see below for the version naming scheme).

Push tag

Bump version in docker-edusign-app
----------------------------------

You have bumped version in edusign-app (see above)

Reference new tag in backend/Dockerfile

Reference new tag in nginx/Dockerfile

Commit and push

Create new staging version
--------------------------

Version name is stN.N.N

Bump version in edusign-app (see above), @ any temporary branch

Bump version in docker-edusign-app (see above), @ branch staging

Create new production version
-----------------------------

Version name is vN.N.N

Bump version in edusign-app (see above), @ branch master

Bump version in docker-edusign-app (see above), @ branch master

If the changes are coming from a staging version,
do the above bumping *before* merging the branch in staging,
and solve the conflicts (wrt the version names) in favor of the new pro versions.

Deploy new staging version
--------------------------

In the staging server, update docker-edusign-app @ branch staging

Rebuild and deploy

Deploy new production version
-----------------------------

In the production server, update docker-edusign-app @ branch master

Rebuild and deploy
