FROM node:lts-alpine3.20
WORKDIR /app
RUN apk update && apk add bash

# Installs latest Chromium (100) package.
# RUN apk add --no-cache \
#     udev \
#     ttf-freefont \
#     chromium

# Installs Chromium (100) package.
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn


# Set the Puppeteer environment variables
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
#     PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add user so we don't need --no-sandbox.
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
USER pptruser

COPY package*.json ./
RUN npm install
COPY . .

# Expose the port that the app runs on
EXPOSE 3031

# Command to run the app
CMD ["npm", "start"]