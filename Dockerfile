FROM node:lts-alpine AS source

WORKDIR /usr/heygen

COPY . .

WORKDIR /usr/heygen/heygen-cli

RUN yarn install

FROM node:lts-alpine AS runtime

WORKDIR /usr/heygen

COPY --from=source /usr/heygen .

WORKDIR /usr/heygen/heygen-cli

CMD ["yarn", "start"]