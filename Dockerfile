FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app
COPY . .

# Install app dependencies
RUN npm install

# Expose port and start application
EXPOSE 3000

CMD ["npm", "start"]

