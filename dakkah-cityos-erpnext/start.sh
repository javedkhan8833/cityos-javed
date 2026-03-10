#!/bin/bash

LOGFILE="/home/runner/workspace/startup.log"
: > "$LOGFILE"
exec > >(tee -a "$LOGFILE") 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

export FRAPPE_BENCH_ROOT=/home/runner/workspace
export SITES_PATH=$FRAPPE_BENCH_ROOT/sites
export PYTHONPATH=$FRAPPE_BENCH_ROOT/apps/frappe:$FRAPPE_BENCH_ROOT:$FRAPPE_BENCH_ROOT/apps/cityos:$PYTHONPATH

mkdir -p /home/runner/logs /home/runner/workspace/sites/site1.local/logs

log "=== Starting Dakkah CityOS ERP ==="
log "Environment: NODE_ENV=${NODE_ENV:-development}"

log "Phase 1: Cleanup old processes..."
pkill -9 -f 'gunicorn.*wsgi' 2>/dev/null || true
pkill -9 -f 'node.*proxy\.js' 2>/dev/null || true
pkill -9 -f 'node.*socketio\.js' 2>/dev/null || true
redis-cli -p 11000 shutdown nosave 2>/dev/null || true
redis-cli -p 13000 shutdown nosave 2>/dev/null || true
sleep 1

for port in 5000 8000 9000 11000 13000; do
    pids=$(lsof -ti :$port 2>/dev/null) || true
    if [ -n "$pids" ]; then
        log "  Force killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
done

for attempt in $(seq 1 10); do
    busy_port=""
    for port in 5000 8000 9000; do
        if lsof -ti :$port >/dev/null 2>&1; then
            busy_port=$port
            break
        fi
    done
    if [ -z "$busy_port" ]; then
        break
    fi
    if [ $attempt -eq 10 ]; then
        log "  WARNING: Port $busy_port still occupied after 10 attempts"
        pids=$(lsof -ti :$busy_port 2>/dev/null) || true
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    fi
    sleep 1
done
log "  All ports cleared"

cd $FRAPPE_BENCH_ROOT

log "Phase 2: Start proxy on port 5000..."
node proxy.js &
PROXY_PID=$!
log "  Proxy launched (PID: $PROXY_PID)"

log "Phase 3: Start Redis..."
redis-server --port 11000 --bind 127.0.0.1 --daemonize yes --dir /tmp --logfile /tmp/redis-cache.log --save "" 2>&1 || true
redis-server --port 13000 --bind 127.0.0.1 --daemonize yes --dir /tmp --logfile /tmp/redis-queue.log --save "" 2>&1 || true

for i in $(seq 1 10); do
    cache_ok=$(redis-cli -p 11000 ping 2>/dev/null) || true
    queue_ok=$(redis-cli -p 13000 ping 2>/dev/null) || true
    if [ "$cache_ok" = "PONG" ] && [ "$queue_ok" = "PONG" ]; then
        log "  Redis cache (11000) and queue (13000) ready"
        break
    fi
    if [ $i -eq 10 ]; then
        log "  WARNING: Redis may not be fully ready (cache=$cache_ok, queue=$queue_ok)"
    fi
    sleep 0.5
done

log "Phase 4: Pre-check database connectivity..."
DB_HOST=$(python3 -c "
import json, os
try:
    with open(os.path.join('$SITES_PATH', 'site1.local', 'site_config.json')) as f:
        c = json.load(f)
    print(c.get('db_host', 'localhost'))
except: print('unknown')
" 2>/dev/null) || DB_HOST="unknown"
log "  Database host: $DB_HOST"

if [ "$DB_HOST" != "unknown" ]; then
    for i in $(seq 1 5); do
        if python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(2)
try:
    s.connect(('$DB_HOST', 5432))
    s.close()
    exit(0)
except:
    exit(1)
" 2>/dev/null; then
            log "  Database reachable at $DB_HOST:5432"
            break
        fi
        if [ $i -eq 5 ]; then
            log "  WARNING: Database at $DB_HOST:5432 not reachable after 5 attempts"
        fi
        sleep 2
    done
fi

log "Phase 5: Ensure database schema is complete..."
SITES_PATH=$SITES_PATH python3 $FRAPPE_BENCH_ROOT/recreate_tables.py 2>&1 | grep -v "^'" | grep -v traceback | grep -v "^\s*File " | head -10
log "  Schema sync complete"

log "Phase 6: Start Socket.IO on port 9000..."
node apps/frappe/socketio.js &
SOCKETIO_PID=$!
log "  Socket.IO launched (PID: $SOCKETIO_PID)"

log "Phase 7: Start Gunicorn on port 8000..."
gunicorn \
  --bind 127.0.0.1:8000 \
  --workers 2 \
  --timeout 120 \
  --graceful-timeout 30 \
  --preload \
  --chdir $FRAPPE_BENCH_ROOT \
  --access-logfile /home/runner/logs/gunicorn-access.log \
  --error-logfile /home/runner/logs/gunicorn-error.log \
  --log-level info \
  wsgi:application &
GUNICORN_PID=$!
log "  Gunicorn launched (PID: $GUNICORN_PID)"

log "Phase 8: Waiting for services to become ready..."
gunicorn_ready=false
for i in $(seq 1 60); do
    if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://127.0.0.1:8000/ 2>/dev/null | grep -qE '^[2-3]'; then
        gunicorn_ready=true
        log "  Gunicorn ready after ${i}s"
        break
    fi
    if ! kill -0 $GUNICORN_PID 2>/dev/null; then
        log "  ERROR: Gunicorn process died (PID: $GUNICORN_PID)"
        log "  Gunicorn error log:"
        cat /home/runner/logs/gunicorn-error.log 2>/dev/null | tail -20
        break
    fi
    if [ $((i % 10)) -eq 0 ]; then
        log "  Still waiting for Gunicorn... (${i}s elapsed)"
    fi
    sleep 1
done

if [ "$gunicorn_ready" = "false" ]; then
    log "  WARNING: Gunicorn not confirmed ready after 60s, but proxy will serve loading page"
fi

log "=== Startup complete ==="
log "  Proxy:     PID $PROXY_PID on port 5000 (external)"
log "  Gunicorn:  PID $GUNICORN_PID on port 8000 (internal)"
log "  Socket.IO: PID $SOCKETIO_PID on port 9000 (internal)"
log "  Redis:     ports 11000 (cache), 13000 (queue)"
log "  Gunicorn:  ready=$gunicorn_ready"

cleanup() {
    log "Shutting down..."
    kill $PROXY_PID $SOCKETIO_PID $GUNICORN_PID 2>/dev/null || true
    redis-cli -p 11000 shutdown nosave 2>/dev/null || true
    redis-cli -p 13000 shutdown nosave 2>/dev/null || true
    wait $PROXY_PID $SOCKETIO_PID $GUNICORN_PID 2>/dev/null || true
    log "Shutdown complete"
    exit 0
}
trap cleanup SIGTERM SIGINT

reload() {
    log "Reloading Gunicorn..."
    kill -HUP $GUNICORN_PID 2>/dev/null || true
}
trap reload SIGHUP

wait $PROXY_PID
