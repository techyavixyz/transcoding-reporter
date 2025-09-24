# Use lightweight Node.js base image
FROM node:23-alpine

# Install timezone data
RUN apk add --no-cache tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only prod)
RUN npm install --production

# Copy source code
COPY . .

# Expose the app port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]