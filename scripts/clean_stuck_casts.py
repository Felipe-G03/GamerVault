#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gamer's Vault - Limpador de Sessões Fantasmas do VaultCast
Encerra sessões que ficaram presas no Firestore e no LiveKit Cloud.
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore

# Busca o arquivo de credenciais na raiz do projeto ou no diretório atual
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cert_path = os.path.join(BASE_DIR, 'firebase-service-account.json')
if not os.path.exists(cert_path):
    cert_path = 'firebase-service-account.json'

try:
    cred = credentials.Certificate(cert_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Erro ao conectar ao Firebase: {e}")
    sys.exit(1)

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

casts = list(db.collection('vaultcasts').stream())
print(f"\nEncontradas {len(casts)} sessões no Firestore.")

for c in casts:
    data = c.to_dict()
    pilot = data.get('pilotName', 'Desconhecido')
    game = data.get('gameTitle', 'Jogo')
    status = data.get('status', 'n/a')
    print(f"- Encerrando sessão: {c.id} (Piloto: {pilot} | Jogo: {game} | Status: {status})")
    c.reference.delete()

print("\n[OK] Todas as sessões fantasmas foram limpas do Firestore!")
