FROM node:16.14.0-alpine3.15

WORKDIR /app

RUN apk update
RUN apk upgrade

COPY package.json package.json

RUN npm i --production
RUN npm audit fix

COPY . .

ENV NODE_ENV="production"
ENV IMAGE_TAG=__image_tag__

EXPOSE 3000
EXPOSE 3443

CMD [ "node", "app.js" ]