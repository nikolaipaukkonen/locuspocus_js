# Use the official Node.js image as the base image
FROM node:20-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Install ffmpeg as a fallback
RUN apk add --no-cache ffmpeg

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Verify ffmpeg-static binary
RUN node -e "require('ffmpeg-static') || console.error('ffmpeg-static not found')"

# Copy ffmpeg-static binary to a known location
RUN mkdir -p /usr/local/bin && \
    cp $(node -e "console.log(require('ffmpeg-static'))") /usr/local/bin/ffmpeg && \
    chmod +x /usr/local/bin/ffmpeg

# Copy the rest of the application code
COPY . .
# Copy the .env file
COPY .env .env

# Build the Next.js app
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app
CMD ["npx", "next", "start"]