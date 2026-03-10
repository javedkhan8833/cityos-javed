#!/bin/bash
exec env PHP_INI_SCAN_DIR="/nix/store/8xs6a2mh8vhb0r5ds4wh5nm6a59x66z6-php-with-extensions-8.2.23/lib:/home/runner/workspace/api/php-ext-conf" php "$@"
