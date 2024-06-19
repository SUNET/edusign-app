FROM mcr.microsoft.com/playwright:v1.44.1-jammy

RUN apt-get update && apt-get install -y wget gnupg ca-certificates && \
   curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
   apt install -y nodejs

# Set working directory
WORKDIR /app

# Copy test code
COPY tests /app/tests
COPY package.json /app/
COPY playwright.config.ts /app/
# Install dependencies
RUN npm cache clean --force
RUN npm install -g playwright
RUN npm install
