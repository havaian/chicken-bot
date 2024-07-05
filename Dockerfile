# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory within the container
WORKDIR /chicken

# Copy the package.json files to the container
COPY package.json ./

# Install app dependencies using Yarn
RUN apk add --update curl && \
    npm install -g npm@latest && \
    npm install -g nodemon@latest && \
    npm install

# Copy the rest of the application code to the container
COPY . ./

# Run start command
# CMD ["npm", "run", "build"]
CMD ["npm", "run", "dev"]