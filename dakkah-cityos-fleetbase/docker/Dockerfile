# syntax = docker/dockerfile:1.2
FROM dunglas/frankenphp:1.11-php8.2-bookworm AS base

# Install packages
RUN apt-get update && apt-get install -y git bind9-utils mycli nodejs npm nano uuid-runtime \
  && mkdir -p /root/.ssh \
  && ssh-keyscan github.com >> /root/.ssh/known_hosts

# Install PHP Extensions
RUN install-php-extensions \
  pdo_mysql \
  pdo_pgsql \
  pgsql \
  gd \
  bcmath \
  redis \
  intl \
  zip \
  gmp \
  apcu \
  opcache \
  memcached \
  imagick \
  sockets \
  pcntl \
  @composer

# Install GEOS build deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       pkg-config \
       libgeos-dev \
       libgeos++-dev \
       autoconf \
       build-essential \
       unzip \
    && rm -rf /var/lib/apt/lists/*

# Build php-geos
RUN curl -fsSL -o php-geos.zip \
      https://github.com/libgeos/php-geos/archive/dfe1ab17b0f155cc315bc13c75689371676e02e1.zip \
    && unzip php-geos.zip \
    && rm php-geos.zip \
    && cd php-geos-* \
    && ./autogen.sh \
    && ./configure \
    && make -j"$(nproc)" install \
    && docker-php-ext-enable geos \
    && cd .. \
    && rm -rf php-geos-*

# PHP settings
RUN sed -e 's/^expose_php.*/expose_php = Off/' "$PHP_INI_DIR/php.ini-production" > "$PHP_INI_DIR/php.ini" \
  && sed -i -e 's/^upload_max_filesize.*/upload_max_filesize = 600M/' \
  -e 's/^post_max_size.*/post_max_size = 0/' \
  -e 's/^memory_limit.*/memory_limit = 600M/' "$PHP_INI_DIR/php.ini"

# Node tools
RUN npm install -g chokidar pnpm ember-cli npm-cli-login

# Install ssm-parent
COPY --from=ghcr.io/springload/ssm-parent:1.8 /usr/bin/ssm-parent /sbin/ssm-parent

ENV LOG_CHANNEL=stdout
ENV CACHE_DRIVER=null
ENV BROADCAST_DRIVER=socketcluster
ENV QUEUE_CONNECTION=redis
ENV CADDYFILE_PATH=/fleetbase/Caddyfile
ENV CONSOLE_PATH=/fleetbase/console
ENV OCTANE_SERVER=frankenphp
ENV FLEETBASE_VERSION=0.7.28

ARG ENVIRONMENT=production
ENV APP_ENV=$ENVIRONMENT

ARG GITHUB_AUTH_KEY

# Create directories
RUN mkdir -p /fleetbase/api /fleetbase/console && chown -R www-data:www-data /fleetbase

# Copy Caddyfile
COPY --chown=www-data:www-data ./Caddyfile $CADDYFILE_PATH

# Set workdir
WORKDIR /fleetbase/api

# 👇👇👇 IMPORTANT FIX STARTS HERE 👇👇👇

# Copy FULL API first (including packages/cityos)
COPY --chown=www-data:www-data ./api /fleetbase/api
RUN chown -R www-data:www-data /fleetbase/api \
    && chmod -R 775 /fleetbase/api/storage \
    && chmod -R 775 /fleetbase/api/bootstrap/cache

# If GitHub token provided
RUN if [ -n "$GITHUB_AUTH_KEY" ]; then echo "{\"github-oauth\": {\"github.com\": \"$GITHUB_AUTH_KEY\"}}" > auth.json; fi

# Install dependencies AFTER full copy
RUN su www-data -s /bin/sh -c "composer install --no-scripts --optimize-autoloader --no-dev --no-cache"

# 👆👆👆 IMPORTANT FIX ENDS HERE 👆👆👆

# Dump autoload
RUN su www-data -s /bin/sh -c "composer dumpautoload"

# Permissions
RUN mkdir -p /fleetbase/api/storage/logs \
    && chown -R www-data:www-data /fleetbase/api/storage \
    && chmod -R 755 /fleetbase/api/storage

# Install go-crond
RUN curl -L https://github.com/webdevops/go-crond/releases/download/23.12.0/go-crond.linux.amd64 > /usr/local/bin/go-crond \
    && chmod +x /usr/local/bin/go-crond

COPY docker/crontab ./crontab
RUN chmod 0600 ./crontab
# ---- STAGES ----

# Scheduler (dev)
FROM base AS scheduler-dev
ENTRYPOINT []
CMD ["go-crond", "--verbose", "root:./crontab"]

# Queue worker (dev)
FROM base AS events-dev
ENTRYPOINT []
CMD ["php", "artisan", "queue:work"]

# Application (dev - WITHOUT Octane for stability)
FROM base AS app-dev
ENTRYPOINT []
CMD ["frankenphp", "run", "--config", "/fleetbase/Caddyfile"]
