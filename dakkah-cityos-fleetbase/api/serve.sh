#!/bin/bash
cd /home/runner/workspace/api
exec php -d memory_limit=512M -S 0.0.0.0:8000 -t public server.php
