# DarkHangar V2 — Lean PyInstaller build spec
# Excludes heavy unused packages, keeps all stdlib intact
#
# Run: pyinstaller DarkHangarV2.spec --clean -y
# Output: dist/DarkHangarV2/DarkHangarV2.exe (folder mode)

import os, sys

block_cipher = None
BASE = os.path.dirname(os.path.abspath(SPEC))

# ── Pymavlink: only include ardupilotmega dialect + core ──────────────────────
pymavlink_path = os.path.dirname(__import__('pymavlink').__file__)
pymavlink_datas = [
    (os.path.join(pymavlink_path, 'dialects'), 'pymavlink/dialects'),
]
pymavlink_hiddenimports = [
    'pymavlink',
    'pymavlink.DFReader',
    'pymavlink.mavutil',
    'pymavlink.mavexpression',
    'pymavlink.mavextra',
    'pymavlink.rotmat',
    'pymavlink.generator',
    'pymavlink.generator.mavcrc',
    'pymavlink.dialects',
    'pymavlink.dialects.v10',
    'pymavlink.dialects.v10.ardupilotmega',
    'pymavlink.dialects.v10.common',
    'pymavlink.dialects.v20',
    'pymavlink.dialects.v20.ardupilotmega',
    'pymavlink.dialects.v20.common',
]

# ── Static assets (frontend build) ───────────────────────────────────────────
static_dir = os.path.join(BASE, 'static')
datas = [
    (static_dir, 'static'),
    *pymavlink_datas,
]

a = Analysis(
    ['app_launcher.py'],
    pathex=[BASE],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # ── Uvicorn ──
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        # ── FastAPI ──
        'fastapi',
        'fastapi.middleware.cors',
        'multipart',
        'multipart.multipart',
        # ── SQLAlchemy (sqlite only) ──
        'sqlalchemy',
        'sqlalchemy.dialects.sqlite',
        # ── NumPy ──
        'numpy',
        # ── Webview ──
        'webview',
        'webview.platforms',
        # ── aiofiles ──
        'aiofiles',
        # ── Pymavlink ──
        *pymavlink_hiddenimports,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # ── GUI frameworks we don't use ──
        'tkinter',
        'PySide6',
        # ── Heavy external packages (lazy-imported only when export is clicked) ──
        'scipy',
        'matplotlib',
        'lxml',
        'PIL',
        # ── Unused pymavlink dialects (biggest size savings) ──
        'pymavlink.dialects.v10.ASLUAV',
        'pymavlink.dialects.v10.AVSSUAS',
        'pymavlink.dialects.v10.all',
        'pymavlink.dialects.v10.csAirLink',
        'pymavlink.dialects.v10.cubepilot',
        'pymavlink.dialects.v10.development',
        'pymavlink.dialects.v10.icarous',
        'pymavlink.dialects.v10.loweheiser',
        'pymavlink.dialects.v10.matrixpilot',
        'pymavlink.dialects.v10.minimal',
        'pymavlink.dialects.v10.paparazzi',
        'pymavlink.dialects.v10.python_array_test',
        'pymavlink.dialects.v10.standard',
        'pymavlink.dialects.v10.storm32',
        'pymavlink.dialects.v10.test',
        'pymavlink.dialects.v10.uAvionix',
        'pymavlink.dialects.v10.ualberta',
        'pymavlink.dialects.v20.ASLUAV',
        'pymavlink.dialects.v20.AVSSUAS',
        'pymavlink.dialects.v20.all',
        'pymavlink.dialects.v20.csAirLink',
        'pymavlink.dialects.v20.cubepilot',
        'pymavlink.dialects.v20.development',
        'pymavlink.dialects.v20.icarous',
        'pymavlink.dialects.v20.loweheiser',
        'pymavlink.dialects.v20.matrixpilot',
        'pymavlink.dialects.v20.minimal',
        'pymavlink.dialects.v20.paparazzi',
        'pymavlink.dialects.v20.python_array_test',
        'pymavlink.dialects.v20.standard',
        'pymavlink.dialects.v20.storm32',
        'pymavlink.dialects.v20.test',
        'pymavlink.dialects.v20.uAvionix',
        'pymavlink.dialects.v20.ualberta',
        # ── Unused pymavlink extras ──
        'pymavlink.fgFDM',
        'pymavlink.mavftp',
        'pymavlink.mavftpfs',
        'pymavlink.mavparm',
        'pymavlink.mavtestgen',
        'pymavlink.mavwp',
        'pymavlink.setup',
        # ── Misc bloat ──
        'psutil',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Folder-mode EXE (fast startup, small launcher)
exe = EXE(
    pyz,
    a.scripts,
    exclude_binaries=True,
    name='DarkHangarV2',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=True,
    upx=True,
    upx_exclude=[],
    name='DarkHangarV2',
)
