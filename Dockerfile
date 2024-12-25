FROM node:lts as source

WORKDIR /usr/heygen

COPY . .

WORKDIR /usr/heygen/heygen-lib

RUN yarn install

FROM node:lts as runtime

WORKDIR /usr/heygen

COPY --from=source /usr/heygen .

CMD ["yarn", "start"]