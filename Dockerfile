FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

RUN npm run prisma:generate
RUN npm run build

EXPOSE 3030

CMD ["npm", "run", "start"]
