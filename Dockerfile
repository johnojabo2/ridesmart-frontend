# Stage 1: Build the React app
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock first (for caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the app (production build)
RUN yarn build

# Stage 2: Serve the app with Nginx
FROM nginx:stable-alpine

# Copy the build output to Nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config if needed (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
