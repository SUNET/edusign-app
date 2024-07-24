FROM mcr.microsoft.com/playwright:v1.45.0-jammy

RUN apt-get update && apt-get install -y wget gnupg ca-certificates && \
   curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
   apt install -y nodejs

ENV PLAYWRIGHT_BASE_URL=https://dev.edusign.sunet.se

# Set working directory
WORKDIR /app

# Copy test code
COPY tests /app/tests
COPY package.json /app/
COPY playwright.config.ts /app/
COPY users-env /app/
COPY start.sh /app/
# Install dependencies
RUN npm cache clean --force
RUN npm install -g playwright
RUN npm install
RUN npx playwright install-deps

ENTRYPOINT ["bash", "start.sh"]
