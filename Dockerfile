FROM node:16-alpine

WORKDIR /app

COPY package.json package.json

RUN npm i --production

COPY . .

ENV NODE_ENV="production"
ENV IMAGE_TAG=__image_tag__

EXPOSE 3000
EXPOSE 3443

CMD [ "node", "app.js" ]