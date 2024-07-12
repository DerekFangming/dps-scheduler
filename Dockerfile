FROM node:22-alpine3.19 AS builder

WORKDIR /app
COPY . .

RUN npm i -g @vercel/ncc
RUN npm i -g @angular/cli@latest

RUN npm i
RUN cd dps-ui && npm i
RUN npm run build-ui
RUN ncc build index.js -o dist


FROM node:22-alpine3.19
WORKDIR /app
COPY --from=builder /app/dist .
CMD ["node", "."]
