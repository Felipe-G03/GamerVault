#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gamer's Vault - Limpador de Sessões Fantasmas do VaultCast
Encerra sessões que ficaram presas no Firestore e no LiveKit Cloud.
"""

import sys
import firebase_admin
from firebase_admin import credentials, firestore

try:
    cred = credentials.Certificate('firebase-service-account.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Erro ao conectar ao Firebase: {e}")
    sys.exit(1)

casts = list(db.collection('vaultcasts').stream())
print(f"\nEncontradas {len(casts)} sessões no Firestore.")

for c in casts:
    data = c.to_dict()
    pilot = data.get('pilotName', 'Desconhecido')
    game = data.get('gameTitle', 'Jogo')
    status = data.get('status', 'n/a')
    print(f"- Encerrando sessão: {c.id} (Piloto: {pilot} | Jogo: {game} | Status: {status})")
    c.reference.delete()

print("\n✅ Todas as sessões fantasmas foram limpas do Firestore!")
