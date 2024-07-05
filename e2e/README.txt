
To run the e2e tests, you need 5 accounts at eduID.

 $ cd e2e/
 $ cp users-env-in users-env
 $ vim users-env  # set the accounts data here

Run tests with Docker:

 $ docker build -t playwright-test .
 $ docker run --rm -ti -v ./tests:/app/tests playwright-test

Run single test:

 $ docker run --rm -ti -v ./tests:/app/tests playwright-test tests/invite-two-defaults-sign-all.spec.ts
