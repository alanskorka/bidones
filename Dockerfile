FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run prisma:generate
RUN npm run build

EXPOSE 3030

CMD ["sh", "-c", "npm run prisma:deploy && npm run start"]
