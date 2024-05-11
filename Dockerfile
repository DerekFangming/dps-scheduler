FROM node:22-alpine3.18 AS builder

WORKDIR /app
COPY . .

RUN npm i
RUN cd dps-ui && npm i
