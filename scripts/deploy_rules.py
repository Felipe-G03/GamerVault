import urllib.request
import json
import sys
from google.auth.transport.requests import Request
from google.oauth2 import service_account

if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def deploy_firestore_rules():
    creds = service_account.Credentials.from_service_account_file(
        'firebase-service-account.json',
        scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    )
    creds.refresh(Request())
    token = creds.token
    project_id = 'gamer-vault-e667a'

    with open('firestore.rules', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Cria o ruleset
    url_ruleset = f'https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets'
    body = {
        'source': {
            'files': [
                {'name': 'firestore.rules', 'content': content}
            ]
        }
    }
    req = urllib.request.Request(
        url_ruleset,
        data=json.dumps(body).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as res:
        ruleset_data = json.loads(res.read().decode('utf-8'))
        ruleset_name = ruleset_data['name']
        print('✅ Ruleset criado:', ruleset_name)

    # 2. Atualiza o release cloud.firestore
    url_release = f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases/cloud.firestore?updateMask=rulesetName'
    release_body = {
        'release': {
            'name': f'projects/{project_id}/releases/cloud.firestore',
            'rulesetName': ruleset_name
        }
    }
    req_release = urllib.request.Request(
        url_release,
        data=json.dumps(release_body).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='PATCH'
    )
    try:
        with urllib.request.urlopen(req_release) as res:
            resp = json.loads(res.read().decode('utf-8'))
            print('🎉 Regras do Firestore atualizadas com sucesso no Firebase Cloud!')
            print('Release ativo:', resp)
    except urllib.error.HTTPError as e:
        print('HTTP ERROR:', e.code, e.read().decode('utf-8'))


if __name__ == '__main__':
    deploy_firestore_rules()
