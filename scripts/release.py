#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gamer's Vault - Script de Release e Deploy Automático
1. Detecta versão no package.json
2. Opção de compilar o instalador (npm run electron:build)
3. Upload do .exe para o Dropbox com barra de progresso
4. Geração do link de download direto (?dl=1)
5. Atualização automática no Firestore (config/app)
"""

import os
import sys
import json
import glob
import argparse
import subprocess
from datetime import datetime

# Garante suporte a UTF-8 no console do Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import dropbox
    from dropbox.files import WriteMode
    from dropbox.exceptions import ApiError
except ImportError:
    print("\n❌ Erro: Biblioteca 'dropbox' não encontrada.")
    print("Execute: pip install dropbox\n")
    sys.exit(1)

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("\n❌ Erro: Biblioteca 'firebase-admin' não encontrada.")
    print("Execute: pip install firebase-admin\n")
    sys.exit(1)

# Caminhos base
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKAGE_JSON_PATH = os.path.join(BASE_DIR, "package.json")
DIST_ELECTRON_DIR = os.path.join(BASE_DIR, "dist-electron")
ENV_PATH = os.path.join(BASE_DIR, ".env")
FIREBASE_KEY_PATH = os.path.join(BASE_DIR, "firebase-service-account.json")

def load_env():
    """Lê variáveis do arquivo .env sem necessidade de libs externas."""
    env_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars

def get_app_version():
    """Lê a versão atual do package.json."""
    if not os.path.exists(PACKAGE_JSON_PATH):
        print(f"❌ package.json não encontrado em: {PACKAGE_JSON_PATH}")
        sys.exit(1)
    with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data.get("version", "2.0.0")

def find_installer_exe(version):
    """Procura pelo executável instalador na pasta dist-electron."""
    if not os.path.exists(DIST_ELECTRON_DIR):
        return None
    
    # Procura arquivos .exe que contenham a versão ou 'Setup'
    patterns = [
        os.path.join(DIST_ELECTRON_DIR, f"*{version}*.exe"),
        os.path.join(DIST_ELECTRON_DIR, "*Setup*.exe"),
        os.path.join(DIST_ELECTRON_DIR, "*.exe"),
    ]
    for pattern in patterns:
        files = glob.glob(pattern)
        setup_files = [f for f in files if not f.endswith("-unpacked.exe") and "win-unpacked" not in f]
        if setup_files:
            # Retorna o arquivo modificado mais recentemente
            setup_files.sort(key=os.path.getmtime, reverse=True)
            return setup_files[0]
    return None

def build_installer():
    """Executa o build do Electron."""
    print("\n📦 Iniciando compilação do executável (npm run electron:build)...")
    result = subprocess.run("npm run electron:build", shell=True, cwd=BASE_DIR)
    if result.returncode != 0:
        print("\n❌ Falha durante a compilação do aplicativo.")
        sys.exit(1)
    print("✅ Compilação finalizada com sucesso!")

def upload_to_dropbox(dbx, local_file_path, dropbox_dest_path):
    """Faz o upload de arquivos grandes para o Dropbox usando sessões em chunks."""
    file_size = os.path.getsize(local_file_path)
    file_size_mb = file_size / (1024 * 1024)
    chunk_size = 4 * 1024 * 1024  # 4MB por chunk

    print(f"\n🚀 Iniciando upload para o Dropbox...")
    print(f"   Arquivo: {os.path.basename(local_file_path)} ({file_size_mb:.2f} MB)")
    print(f"   Destino: {dropbox_dest_path}")

    with open(local_file_path, "rb") as f:
        if file_size <= chunk_size:
            dbx.files_upload(f.read(), dropbox_dest_path, mode=WriteMode("overwrite"))
            print("   Progresso: [####################] 100%")
        else:
            upload_session_start_result = dbx.files_upload_session_start(f.read(chunk_size))
            cursor = dropbox.files.UploadSessionCursor(
                session_id=upload_session_start_result.session_id,
                offset=f.tell()
            )
            commit = dropbox.files.CommitInfo(path=dropbox_dest_path, mode=WriteMode("overwrite"))

            while f.tell() < file_size:
                percentage = int((f.tell() / file_size) * 100)
                filled = int(percentage / 5)
                bar = "#" * filled + "-" * (20 - filled)
                current_mb = f.tell() / (1024 * 1024)
                sys.stdout.write(f"\r   Progresso: [{bar}] {percentage}% ({current_mb:.1f}MB/{file_size_mb:.1f}MB)")
                sys.stdout.flush()

                if (file_size - f.tell()) <= chunk_size:
                    dbx.files_upload_session_finish(f.read(chunk_size), cursor, commit)
                else:
                    dbx.files_upload_session_append_v2(f.read(chunk_size), cursor)
                    cursor.offset = f.tell()

            sys.stdout.write(f"\r   Progresso: [####################] 100% ({file_size_mb:.1f}MB/{file_size_mb:.1f}MB)\n")
            sys.stdout.flush()

    print("✅ Upload concluído com sucesso no Dropbox!")

def get_or_create_direct_link(dbx, dropbox_dest_path):
    """Obtém ou cria o link compartilhado público e o formata com dl=1."""
    print("\n🔗 Obtendo link de download direto...")
    shared_link_url = None

    try:
        shared_link_metadata = dbx.sharing_create_shared_link_with_settings(dropbox_dest_path)
        shared_link_url = shared_link_metadata.url
    except ApiError as err:
        # Se o link já existir, recupera os links existentes
        if err.error.is_shared_link_already_exists():
            links = dbx.sharing_list_shared_links(path=dropbox_dest_path).links
            if links:
                shared_link_url = links[0].url
        else:
            raise err

    if not shared_link_url:
        print("❌ Não foi possível gerar a URL de compartilhamento do Dropbox.")
        sys.exit(1)

    # Converte o link para download direto (dl=1)
    if "dl=0" in shared_link_url:
        direct_url = shared_link_url.replace("dl=0", "dl=1")
    elif "?" in shared_link_url:
        direct_url = f"{shared_link_url}&dl=1"
    else:
        direct_url = f"{shared_link_url}?dl=1"

    print(f"✅ Link direto gerado: {direct_url}")
    return direct_url

def update_firebase(version, direct_url, changelog, release_date):
    """Atualiza o documento config/app no Firestore com as informações da versão."""
    print("\n🔥 Conectando ao Firebase Firestore...")
    if not os.path.exists(FIREBASE_KEY_PATH):
        print(f"❌ Arquivo de credenciais do Firebase não encontrado: {FIREBASE_KEY_PATH}")
        sys.exit(1)

    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    config_ref = db.collection("config").document("app")

    payload = {
        "latestVersion": version,
        "downloadUrl": direct_url,
        "changelog": changelog,
        "releaseDate": release_date,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }

    config_ref.set(payload, merge=True)
    print("✅ Documento 'config/app' atualizado no Firestore!")

def parse_arguments():
    parser = argparse.ArgumentParser(description="Publicador de Atualizações do Gamer's Vault")
    parser.add_argument("--build", action="store_true", help="Força a compilação do executável antes de enviar")
    parser.add_argument("--skip-build", action="store_true", help="Pula a etapa de compilação")
    parser.add_argument("--changelog", type=str, help="Texto das novidades da versão")
    parser.add_argument("-y", "--yes", action="store_true", help="Não pergunta confirmações interativas")
    return parser.parse_args()

def main():
    args = parse_arguments()

    print("=" * 60)
    print(" 🎮 GAMER'S VAULT - PUBLICADOR DE ATUALIZAÇÃO AUTOMÁTICA")
    print("=" * 60)

    # 1. Carrega variáveis de ambiente
    env_vars = load_env()
    dropbox_token = env_vars.get("DROPBOX_ACCESS_TOKEN") or os.environ.get("DROPBOX_ACCESS_TOKEN")
    if not dropbox_token:
        dropbox_token = input("\n🔑 Digite o DROPBOX_ACCESS_TOKEN: ").strip()
        if not dropbox_token:
            print("❌ O Token do Dropbox é obrigatório.")
            sys.exit(1)

    # 2. Testa autenticação no Dropbox
    try:
        dbx = dropbox.Dropbox(dropbox_token)
        account = dbx.users_get_current_account()
        print(f"👤 Conectado ao Dropbox como: {account.name.display_name} ({account.email})")
    except Exception as e:
        print(f"❌ Erro ao autenticar no Dropbox: {e}")
        print("Dica: Se o token for temporário (short-lived), gere um novo em https://www.dropbox.com/developers/apps")
        sys.exit(1)

    # 3. Detecta versão
    version = get_app_version()
    print(f"\n📌 Versão do projeto (package.json): v{version}")

    # 4. Verifica instalador
    installer_path = find_installer_exe(version)

    if args.build:
        build_installer()
        installer_path = find_installer_exe(version)
    elif not installer_path:
        print(f"⚠️  Nenhum executável instalador encontrado para a versão v{version}.")
        if args.yes:
            build_installer()
        else:
            build_choice = input("Deseja rodar 'npm run electron:build' agora? (S/n): ").strip().lower()
            if build_choice != "n":
                build_installer()
            else:
                print("❌ Não é possível prosseguir sem o instalador .exe.")
                sys.exit(1)
        installer_path = find_installer_exe(version)
    else:
        print(f"📁 Instalador encontrado: {os.path.basename(installer_path)}")
        if not args.skip_build and not args.yes:
            rebuild_choice = input("Deseja recompilar antes de enviar? (s/N): ").strip().lower()
            if rebuild_choice == "s":
                build_installer()
                installer_path = find_installer_exe(version)

    if not installer_path:
        print("❌ Instalador .exe não encontrado em dist-electron.")
        sys.exit(1)

    # 5. Coleta informações do Changelog
    if args.changelog:
        changelog = args.changelog
    else:
        print("\n📝 Registro de Mudanças (Changelog):")
        default_changelog = f"Atualização v{version} com melhorias e correções."
        if args.yes:
            changelog = default_changelog
        else:
            changelog = input(f"Digite o resumo das novidades (Enter para '{default_changelog}'): ").strip()
            if not changelog:
                changelog = default_changelog

    release_date = datetime.now().strftime("%d/%m/%Y")

    # 6. Upload para o Dropbox
    exe_filename = os.path.basename(installer_path)
    dropbox_dest_path = f"/GamerVault/Releases/{exe_filename}"
    upload_to_dropbox(dbx, installer_path, dropbox_dest_path)

    # 7. Obtenção do link direto (?dl=1)
    direct_url = get_or_create_direct_link(dbx, dropbox_dest_path)

    # 8. Atualização no Firebase Firestore
    update_firebase(version, direct_url, changelog, release_date)

    # 9. Conclusão
    print("\n" + "=" * 60)
    print(" 🎉 ATUALIZAÇÃO PUBLICADA COM SUCESSO!")
    print("=" * 60)
    print(f"   • Versão:      v{version}")
    print(f"   • Data:        {release_date}")
    print(f"   • Changelog:   {changelog}")
    print(f"   • Download:    {direct_url}")
    print("\n✨ Todos os usuários que abrirem o Gamer's Vault agora receberão o aviso")
    print("   de atualização e o download será feito diretamente pelo link do Dropbox!\n")

if __name__ == "__main__":
    main()
