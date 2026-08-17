#!/bin/bash
set -e

echo "Starting MongoDB..."
mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017 --fork --logpath /var/log/mongodb/mongod.log --wiredTigerCacheSizeGB 0.25

sleep 3

echo "Seeding database..."
node src/seed.js || true

echo "Starting Smart Hotel API..."
exec node src/index.js
