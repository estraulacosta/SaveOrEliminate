FROM node:18-alpine

WORKDIR /app

COPY server/package*.json /app/

RUN npm ci

COPY server/src /app/src
COPY server/tsconfig.json /app/

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
