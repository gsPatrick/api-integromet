FROM node:20

# Install system dependencies for OCR and PDF processing
# - graphicsmagick: required by pdf2pic
# - ghostscript: required by pdf2pic and general PDF manipulation
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install specific dependencies including sharp (platform specific binaries)
RUN npm install

# Copy application source code
COPY . .

# Expose the API port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
