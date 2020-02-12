FROM node:12.15.0

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

RUN npm install

EXPOSE 4000

CMD [ "npm", "start" ]