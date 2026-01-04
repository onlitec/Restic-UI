FROM node:20-alpine

# Install restic
RUN apk add --no-cache restic docker-cli

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy source
COPY src ./src

# Expose port
EXPOSE 3500

# Start server
CMD ["node", "src/index.js"]
