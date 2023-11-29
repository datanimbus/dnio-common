FROM node:18-alpine

WORKDIR /tmp/app

RUN apk update
RUN apk upgrade

RUN apk add g++ make py3-pip curl tar git

COPY package.json package.json

RUN npm install -g npm
# RUN npm i --production --no-audit
RUN npm i --production
RUN npm audit fix --production

RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test
RUN mkdir -p generatedCode

COPY . .

ENV NODE_ENV="production"
ENV IMAGE_TAG=__image_tag__

EXPOSE 3000
EXPOSE 3443

RUN chmod -R 777 /tmp/app

CMD [ "node", "app.js" ]