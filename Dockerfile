# Stage 1: Build the React app
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock first (for caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install 

# Copy the rest of the app
COPY . .

# Build the app (production build)
RUN yarn build
EXPOSE 8080

# Start Nginx
CMD ["npm", "start"]
