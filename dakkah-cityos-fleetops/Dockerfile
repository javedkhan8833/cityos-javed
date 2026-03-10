FROM node:20-alpine

WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install ALL deps (needed for build)
RUN npm install

# Copy project
COPY . .

# Build
RUN npm run build

# Remove dev deps AFTER build
RUN npm prune --omit=dev

EXPOSE 5000

CMD ["node", "dist/index.cjs"]