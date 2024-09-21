FROM node:lts-alpine3.20
WORKDIR /app
RUN apk update && apk add bash

# Installs latest Chromium (100) package.
RUN apk add --no-cache \
    udev \
    ttf-freefont \
    chromium


# Set the Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup -S pptruser && adduser -S pptruser -G pptruser -s /bin/sh -D
USER pptruser


USER root
RUN npx puppeteer browsers install chrome --install-deps

USER pptruser

COPY package*.json ./
RUN npm install
COPY . .

# Expose the port that the app runs on
EXPOSE 3031

# Command to run the app
CMD ["npm", "start"]