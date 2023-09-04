FROM --platform=linux/amd64 node:18.8.0-alpine

LABEL description="This container serves as an entry point for our future Snek Function projects."
LABEL org.opencontainers.image.source="https://github.com/snek-functions/social"
LABEL maintainer="opensource@snek.at"

WORKDIR /app

COPY .sf/ ./.sf
COPY package.json .
# Copy prisma files
COPY prisma/schema.prisma ./prisma/schema.prisma

RUN yarn install --production

RUN npx prisma generate

CMD ["sh", "-c", "yarn sf-server"]

EXPOSE 3000

# SPDX-License-Identifier: (EUPL-1.2)
# Copyright © 2022 snek.at
