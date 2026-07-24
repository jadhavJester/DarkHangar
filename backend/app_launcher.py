"""
DarkHangar V2 — Desktop Application Launcher
=============================================
Starts the FastAPI server in a background thread, then opens a native OS
window via pywebview with the light cream glassmorphism theme.

Usage (development):
    python app_launcher.py

Usage (packaged):
    DarkHangarV2.exe   (double-click)
"""
import sys
import os
import time
import socket
import threading
import logging

# ── Logging ───────────────────────────────────────────────────────────────────
os.environ["MPLBACKEND"] = "Agg"
os.environ["MPLCONFIGDIR"] = os.path.join(os.path.expanduser("~"), "DarkHangarV2", "mplconfig")

_log_dir = os.path.join(os.path.expanduser("~"), "DarkHangarV2")
os.makedirs(_log_dir, exist_ok=True)
_log_file = os.path.join(_log_dir, "debug.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    filename=_log_file,
    filemode="w",
    force=True,
)
log = logging.getLogger("darkhangar_v2")
log.info(f"Logging initialized. Debug log: {_log_file}")


def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    log.critical("Uncaught exception:", exc_info=(exc_type, exc_value, exc_traceback))


sys.excepthook = handle_exception

# ── Resolve base directory (works both in dev and PyInstaller bundle) ──────────
if getattr(sys, "frozen", False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, BASE_DIR)

APP_TITLE = "DarkHangar V2 — UAV Flight Log Analyzer"
APP_WIDTH = 1440
APP_HEIGHT = 900
APP_MIN_W = 1024
APP_MIN_H = 680
BG_COLOR = "#f5efe3"  # Light cream matching the CSS theme


def _find_free_port(start: int = 8765) -> int:
    """Find an available TCP port starting from `start`."""
    for port in range(start, start + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start


def _wait_for_server(port: int, timeout: float = 45.0) -> bool:
    """Poll until the server is accepting connections."""
    log.info(f"Waiting for server on port {port}...")
    deadline = time.time() + timeout
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                log.info(f"Server ready after {attempt} attempts.")
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    log.error("Server did not start within timeout.")
    return False


def _start_server(port: int, ready_event: threading.Event):
    """Start uvicorn, signal when ready."""
    try:
        import main
        log.info("main module imported OK")
        import uvicorn
        log.info("uvicorn imported OK")

        config = uvicorn.Config(
            main.app,
            host="127.0.0.1",
            port=port,
            log_level="info",
            access_log=True,
        )
        server = uvicorn.Server(config)
        log.info("Server created, starting...")
        ready_event.set()
        server.run()
    except Exception:
        log.exception("Server thread error:")
        ready_event.set()


def main():
    port = _find_free_port(8765)
    url = f"http://127.0.0.1:{port}"

    log.info(f"Starting DarkHangar V2 on port {port}...")

    server_ready = threading.Event()
    server_thread = threading.Thread(
        target=_start_server, args=(port, server_ready), daemon=True, name="darkhangar-v2-server"
    )
    server_thread.start()

    if not _wait_for_server(port):
        log.error("Server did not start in time. Exiting.")
        sys.exit(1)

    log.info(f"Server ready at {url}")

    # ── Open native window ────────────────────────────────────────────────────
    try:
        import webview
    except ImportError:
        log.warning("pywebview not installed. Opening in browser.")
        import webbrowser
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        return

    try:
        window = webview.create_window(
            title=APP_TITLE,
            url=url,
            width=APP_WIDTH,
            height=APP_HEIGHT,
            min_size=(APP_MIN_W, APP_MIN_H),
            resizable=True,
            text_select=True,
            background_color=BG_COLOR,
        )
        webview.start(debug=False, private_mode=False)
        log.info("Window closed. Shutting down.")
    except Exception:
        log.exception("Webview error:")


if __name__ == "__main__":
    main()
