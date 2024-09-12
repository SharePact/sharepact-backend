FROM node:lts-alpine3.20
# WORKDIR /
# RUN apk update && apk add bash

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# Expose the port that the app runs on
EXPOSE 3031

# Command to run the app
CMD ["npm", "start"]