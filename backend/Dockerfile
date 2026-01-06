FROM php:8.3-cli-alpine

RUN apk add --no-cache bash git unzip libzip-dev postgresql-dev \
  && docker-php-ext-install pdo_pgsql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000
