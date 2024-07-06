# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory within the container
WORKDIR /chicken

# Copy the package.json files to the container
COPY package.json ./

# Install app dependencies using npm
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont && \
    npm install -g npm@latest && \
    npm install -g nodemon@latest && \
    npm install

# Set Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy the rest of the application code to the container
COPY . ./

# Run start command
CMD ["npm", "run", "build"]
# CMD ["npm", "run", "dev"]
