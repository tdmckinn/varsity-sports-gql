FROM node:12.15.0

RUN curl -o- -L https://yarnpkg.com/install.sh | bash

RUN mkdir -p /usr/app
WORKDIR /usr/app
COPY . .

RUN npm install

EXPOSE 4000

CMD [ "npm", "start" ]