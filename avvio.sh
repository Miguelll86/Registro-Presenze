#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "1/4 Installazione dipendenze..."
npm install

echo "2/4 Generazione client Prisma..."
npx prisma generate

echo "3/4 Creazione database e tabelle..."
npx prisma db push

echo "4/4 Seed (utente admin)..."
npx tsx prisma/seed.ts

echo ""
echo "Avvio server di sviluppo..."
npm run dev
