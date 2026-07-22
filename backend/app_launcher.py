"""
Flight Log Analyzer — Desktop Application Launcher
==================================================
Starts the FastAPI server in a background thread, then opens a native OS
window via pywebview.

Usage (development):
    python app_launcher.py

Usage (packaged):
    DarkHangar.exe   (double-click)
"""
import sys
import os
import time
import socket
import threading
import logging

# ── Logging ───────────────────────────────────────────────────────────────────
_log_file = os.path.join(os.path.expanduser("~"), "flight_analyzer_debug.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    filename=_log_file,
    filemode="w",
    force=True
)
log = logging.getLogger("flight_analyzer")
log.info(f"Logging initialized. Writing debug log to {_log_file}")

def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    log.critical("Uncaught exception:", exc_info=(exc_type, exc_value, exc_traceback))

sys.excepthook = handle_exception

# ── Resolve base directory (works both in dev and PyInstaller bundle) ──────────
if getattr(sys, "frozen", False):
    # Running inside a PyInstaller bundle
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the backend directory to sys.path so imports work
sys.path.insert(0, BASE_DIR)


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
            log.info(f"Attempt {attempt}: trying to connect to 127.0.0.1:{port}")
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                log.info("Socket connection succeeded!")
                return True
        except (ConnectionRefusedError, OSError) as e:
            log.info(f"Attempt {attempt} failed: {e}")
            time.sleep(0.2)
    log.info("Server wait timeout exceeded!")
    return False


def _start_server(port: int):
    """Start uvicorn in this thread (blocks until shutdown)."""
    try:
        log.info("Server thread started. Importing uvicorn and main...")
        import uvicorn
        import main
        log.info("uvicorn and main imported. Running app...")
        uvicorn.run(
            main.app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
        )
        log.info("uvicorn server stopped.")
    except Exception as e:
        log.exception("Error in server thread:")


def main():
    port = _find_free_port(8765)
    url  = f"http://127.0.0.1:{port}"

    log.info(f"Starting server on port {port}…")

    server_thread = threading.Thread(
        target=_start_server, args=(port,), daemon=True, name="dark-hangar-server"
    )
    server_thread.start()

    # Wait for the server to be ready (max 15 s)
    if not _wait_for_server(port):
        log.error("Server did not start in time. Exiting.")
        sys.exit(1)

    log.info(f"Server ready at {url}")

    # ── Open native window ────────────────────────────────────────────────────
    try:
        import webview
    except ImportError:
        log.error(
            "pywebview is not installed. Run: pip install pywebview\n"
            f"Opening in your default browser instead: {url}"
        )
        import webbrowser
        webbrowser.open(url)
        # Keep server alive until Ctrl-C
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        return

    try:
        log.info("Creating webview window...")
        window = webview.create_window(
            title="Flight Log Analyzer",
            url=url,
            width=1440,
            height=900,
            min_size=(1024, 680),
            resizable=True,
            text_select=False,
            background_color="#0b0d10",
        )
        log.info("Starting webview...")
        webview.start(debug=False, private_mode=False)
        log.info("Window closed. Shutting down.")
    except Exception as e:
        log.exception("Error in webview initialization or main loop:")


if __name__ == "__main__":
    main()
