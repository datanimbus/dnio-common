FROM node:14-alpine

WORKDIR /app

COPY package.json package.json

RUN npm i --production

COPY . .

ENV NODE_ENV="production"

EXPOSE 3000
EXPOSE 3443

CMD [ "node", "app.js" ]