FROM node:lts-alpine3.20
WORKDIR /app
RUN apk update && apk add bash


COPY package*.json ./
RUN npm install
RUN npm install -g phantomjs-prebuilt
RUN which phantomjs
COPY . .

# Expose the port that the app runs on
EXPOSE 3031

# Command to run the app
CMD ["npm", "start"]