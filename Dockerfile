FROM node:22-alpine3.18 AS builder

WORKDIR /app
COPY . .

RUN npm install -g @angular/cli@latest

RUN npm i
RUN cd dps-ui && npm i
RUN npm run build-ui
RUN ls
RUN ls public

RUN rm -r dps-ui

CMD ["node", "."]
