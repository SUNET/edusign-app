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

Create (named, signed) tag with version as name (same version as bumped in edusign-app)

Push tag

create new (bugfix|feature) branch
----------------------------------

Open issue in github

Name of the branch: N-desc-of-issue, where N is the number of the github issue

branch off staging.

Merge (bugfix|feature) branch
-----------------------------

Development on the branch is complete

Merge branch to staging

Rebase with staging and force push any other remaining (bugfix|feature) branches

Create new staging version
--------------------------

You have one or more (bugfix|feature) edusign-app (and perhaps docker-edusign-app) branches, branched off staging.

You merge those branches to staging.

Version name is vN.N.N-rcN (N are integers).
This is semver: minor number increased for bugfixes,
middle number for backwards compatible features,
major number for backwards incompatible changes.

Bump version in edusign-app (see above), @ branch staging

Bump version in docker-edusign-app (see above), @ branch staging

Create new hotfix version
-------------------------

You have one edusign-app (and perhaps docker-edusign-app) (bugfix|feature) branch, branched off staging.

Create hotfix branch, with name hotfix-desc-of-issue

Version name is vN.N.N-rcN (N are integers)

Bump version in edusign-app (see above), @ the hotfix branch

If there is no hotfix branch for docker-edusign-app, do create it

Bump version in docker-edusign-app (see above), @ the hotfix branch

Create new production version
-----------------------------

Version name is vN.N.N

Staging environment holds a tag that has been approved for production

Merge staging (or the hotfix branch in case of a hotfix) to master (both edusign-app and docker-edusign-app)

Bump version in edusign-app (see above), @ branch master

Bump version in docker-edusign-app (see above), @ branch master

Remove the (bugfix|feature) branches that are behind master (check at github).

If the new version comes from a hotfix, remove the hotfix branch

Deploy new staging version
--------------------------

In the staging server, update docker-edusign-app and checkout the tag to deploy

Rebuild and deploy

Deploy new production version
-----------------------------

In the production server, update docker-edusign-app and checkout the tag to deploy

Rebuild and deploy
