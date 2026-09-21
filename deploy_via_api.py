#!/usr/bin/env python3
"""通过 GitHub API 推送源码（main）并部署 dist 到 gh-pages，然后开启 Pages。
适用于 github.com 443 被阻断、但 api.github.com 可用的网络环境。"""
import base64
import os
import subprocess
import sys

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

TOKEN = subprocess.check_output(['gh', 'auth', 'token'], text=True).strip()
H = {'Authorization': f'token {TOKEN}', 'Accept': 'application/vnd.github+json'}

# 网络不稳定时自动重试（SSL 中断、连接错误、5xx）
_session = requests.Session()
_session.mount('https://', HTTPAdapter(max_retries=Retry(
    total=6, backoff_factor=2, status_forcelist=(500, 502, 503, 504),
    allowed_methods=frozenset(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']),
)))
requests = type('requests', (), {
    'get': staticmethod(lambda *a, **k: _session.get(*a, timeout=30, **k)),
    'post': staticmethod(lambda *a, **k: _session.post(*a, timeout=30, **k)),
    'patch': staticmethod(lambda *a, **k: _session.patch(*a, timeout=30, **k)),
    'put': staticmethod(lambda *a, **k: _session.put(*a, timeout=30, **k)),
    'delete': staticmethod(lambda *a, **k: _session.delete(*a, timeout=30, **k)),
})
OWNER, REPO = 'bozhutarek-dev', 'strategy-quiz'
API = f'https://api.github.com/repos/{OWNER}/{REPO}'
ROOT = os.path.dirname(os.path.abspath(__file__))

SKIP_DIRS = {'.git', 'node_modules', 'dist'}
SKIP_FILES = set()


def create_blob(data: bytes) -> str:
    r = requests.post(f'{API}/git/blobs', headers=H, json={
        'content': base64.b64encode(data).decode(), 'encoding': 'base64'})
    r.raise_for_status()
    return r.json()['sha']


def get_ref_sha(branch: str):
    r = requests.get(f'{API}/git/ref/heads/{branch}', headers=H)
    return r.json()['object']['sha'] if r.status_code == 200 else None


def push_files(files: dict, branch: str, message: str):
    tree_items = []
    for path, data in sorted(files.items()):
        tree_items.append({'path': path, 'mode': '100644', 'type': 'blob', 'sha': create_blob(data)})
    parent = get_ref_sha(branch)
    body = {'tree': tree_items}
    if parent:
        c = requests.get(f'{API}/git/commits/{parent}', headers=H)
        c.raise_for_status()
        body['base_tree'] = c.json()['tree']['sha']
    r = requests.post(f'{API}/git/trees', headers=H, json=body)
    r.raise_for_status()
    tree_sha = r.json()['sha']
    r = requests.post(f'{API}/git/commits', headers=H, json={
        'message': message, 'tree': tree_sha, 'parents': [parent] if parent else []})
    r.raise_for_status()
    commit_sha = r.json()['sha']
    if parent:
        r = requests.patch(f'{API}/git/refs/heads/{branch}', headers=H, json={'sha': commit_sha, 'force': True})
    else:
        r = requests.post(f'{API}/git/refs', headers=H, json={'ref': f'refs/heads/{branch}', 'sha': commit_sha})
    r.raise_for_status()
    print(f'[{branch}] {len(files)} 个文件已推送，commit: {commit_sha[:8]}')


def collect_main_files():
    files = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if fn in SKIP_FILES or fn.endswith('.log'):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT)
            with open(full, 'rb') as f:
                files[rel] = f.read()
    return files


def collect_dist_files():
    files = {}
    dist = os.path.join(ROOT, 'dist')
    for dirpath, _, filenames in os.walk(dist):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, dist)
            with open(full, 'rb') as f:
                files[rel] = f.read()
    return files


def enable_pages():
    r = requests.post(f'{API}/pages', headers=H, json={'source': {'branch': 'gh-pages', 'path': '/'}})
    if r.status_code == 409:
        r = requests.put(f'{API}/pages', headers=H, json={'source': {'branch': 'gh-pages', 'path': '/'}})
    r.raise_for_status()
    info = requests.get(f'{API}/pages', headers=H).json()
    print('Pages 状态:', info.get('status'), '| 网址:', info.get('html_url'))


def ensure_repo_initialized():
    """空仓库（无提交）时 Git Data API 会返回 409，先用 Contents API 创建首个文件。"""
    if get_ref_sha('main') is None:
        r = requests.put(f'{API}/contents/README.md', headers=H, json={
            'message': '初始化仓库',
            'content': base64.b64encode('# 战略测试问卷\n'.encode()).decode(),
        })
        r.raise_for_status()
        print('空仓库已初始化（README.md）')


if __name__ == '__main__':
    print('仓库:', requests.get(API, headers=H).json().get('full_name'))
    ensure_repo_initialized()
    push_files(collect_main_files(), 'main', '战略测试问卷：源码')
    push_files(collect_dist_files(), 'gh-pages', '部署：战略测试问卷静态站点')
    enable_pages()
