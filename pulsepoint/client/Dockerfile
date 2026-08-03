# Step 1: Build Vite React App
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve using Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx config if needed, or default
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
