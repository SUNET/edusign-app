RELEASING
=========

EduSign tries to adhere as closely as possible to the semantic versioning
scheme semver [1]_.

It uses `tbump` [2]_ to manage releases.

The project resides on 2 repositories, one for the code [3]_ and one for the
docker deployment [4]_.

When we want to make a new release, we first bump the version at the code repo,
and then at the docker repo.  To bump the version in both repos::

  $ tbump <version string>

Where version string is e.g. `1.0.0rc2` or `1.0.0`.

This will not only put the version string in all the appropriate places, it
will make the appropriate git tags and commits and push's (after the user has
agreed to the proposed changes). To see what is done with the version string in
each repo, check out their `tbump.toml` files.

To deploy a new version, we clone the docker repo [4]_ and checkout the tag
corresponding to the new version (which is the version provided to `tbump`,
prefixed with a `v`, e.g. `git checkout v1.0.0rc2`). Then we deploy it,
building the docker images and starting containers from them.

Each tagged version of the docker repo knows how to retrieve the correct
version from the code repo to build the docker images, so the only
responsibility of the deployer is to use the correct tag in the docker repo.

Development cycle
-----------------

Development happens in temporary feature and bugfix git branches. There should
be a github issue for each task, and the corresponding dedicated git branch
should have a name prefixed with the corresponding issue number (e.g.
`27-fix-send-button` would be a branch corresponding to github issue #27, about
some problem with a send button).

These temporary branches are branched off from the `staging` branch. Once work
is completed in each of them, they are merged back to the `staging` branch. New
versions are cut from the staging branch (using `tbump` as specified above).
When a new version is released, the code in the `staging` branch is merged to
the master branch, all the dedicated branches that are now behind master are
deleted, and the corresponding issues closed.

New Version
-----------

* documentation
* translations
* changes
* errors


.. [1] https://semver.org
.. [2] https://pypi.org/project/tbump/
.. [3] https://github.com/SUNET/edusign-app
.. [4] https://github.com/SUNET/docker-edusign-app
