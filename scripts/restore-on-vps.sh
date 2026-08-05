#!/bin/bash
set -e
cd ~/order-tracking

echo "Waiting for postgres..."
for i in $(seq 1 30); do
  db=$(docker inspect -f '{{.State.Health.Status}}' order-tracking-db 2>/dev/null || echo starting)
  pdb=$(docker inspect -f '{{.State.Health.Status}}' products-db 2>/dev/null || echo starting)
  echo "health db=$db products=$pdb"
  if [ "$db" = "healthy" ] && [ "$pdb" = "healthy" ]; then
    break
  fi
  sleep 2
done

docker cp backups/ordertracking.dump order-tracking-db:/tmp/ordertracking.dump
docker cp backups/products.dump products-db:/tmp/products.dump

echo "Restoring ordertracking..."
docker exec order-tracking-db pg_restore -U ordertracking -d ordertracking \
  --clean --if-exists --no-owner --no-acl /tmp/ordertracking.dump || true

echo "Restoring products..."
docker exec products-db pg_restore -U products -d products \
  --clean --if-exists --no-owner --no-acl /tmp/products.dump || true

echo "Counts:"
docker exec order-tracking-db psql -U ordertracking -d ordertracking -c 'SELECT COUNT(*) AS admin_users FROM "AdminUsers";' || \
  docker exec order-tracking-db psql -U ordertracking -d ordertracking -c '\dt'
docker exec products-db psql -U products -d products -c 'SELECT COUNT(*) AS products FROM products;' || \
  docker exec products-db psql -U products -d products -c '\dt'

echo "Restoring MinIO volume..."
docker volume create order-tracking_minio_data >/dev/null || true
docker run --rm \
  -v order-tracking_minio_data:/data \
  -v /root/order-tracking/backups:/backup \
  alpine:3.20 \
  sh -c 'rm -rf /data/lost+found; tar xzf /backup/minio_data.tar.gz -C /data; ls -la /data | head -20'

echo RESTORE_OK
