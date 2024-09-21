# Use an Ubuntu-based Node.js image (Node 22.8.0 slim)
FROM node:22.8.0-slim

# Set the working directory
WORKDIR /app

# Update the package manager and install necessary dependencies
RUN apt-get update && apt-get install -y \
    bash 

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port that the app will run on
EXPOSE 3031

# Command to run the app
CMD ["npm", "start"]