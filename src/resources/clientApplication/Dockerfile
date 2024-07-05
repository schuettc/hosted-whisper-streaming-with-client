# Use an official Node.js runtime as the base image
FROM --platform=linux/amd64 node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and yarn.lock to the working directory
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Set build-time arguments for environment variables
ARG NEXT_PUBLIC_WHISPER_SERVER_HOST
ARG NEXT_PUBLIC_WHISPER_SERVER_PORT

# Set environment variables
ENV NEXT_PUBLIC_WHISPER_SERVER_HOST=$NEXT_PUBLIC_WHISPER_SERVER_HOST
ENV NEXT_PUBLIC_WHISPER_SERVER_PORT=$NEXT_PUBLIC_WHISPER_SERVER_PORT

# Build the Next.js application
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["yarn", "server"]