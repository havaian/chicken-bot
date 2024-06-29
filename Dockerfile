# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory within the container
WORKDIR /semurg

# Copy the package.json files to the container
COPY package.json ./
COPY entrypoint.sh ./

# Install app dependencies using Yarn
RUN apk add --update curl && \
    npm install -g npm@latest && \
    npm install -g nodemon@latest && \
    npm install

# Copy the rest of the application code to the container
COPY . ./

# Expose the port your application will run on
EXPOSE 1234

# Run start command
CMD ["npm", "run", "build"]
# CMD ["npm", "run", "dev"]