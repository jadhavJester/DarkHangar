"""
Dark Hangar — Desktop Application Launcher
==========================================
Starts the FastAPI server in a background thread, then opens a native OS
window via pywebview. When packaged with PyInstaller this becomes a
standalone DarkHangar.exe.

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
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("dark_hangar")

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


def _wait_for_server(port: int, timeout: float = 15.0) -> bool:
    """Poll until the server is accepting connections."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    return False


def _start_server(port: int):
    """Start uvicorn in this thread (blocks until shutdown)."""
    import uvicorn
    import main
    uvicorn.run(
        main.app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        access_log=False,
    )


def main():
    port = _find_free_port(8765)
    url  = f"http://127.0.0.1:{port}"

    log.info(f"Starting Dark Hangar server on port {port}…")

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

    window = webview.create_window(
        title="Dark Hangar — UAV Flight Log Analyzer",
        url=url,
        width=1440,
        height=900,
        min_size=(1024, 680),
        resizable=True,
        text_select=False,
        background_color="#0b0d10",
    )

    webview.start(debug=False, private_mode=False)
    log.info("Window closed. Shutting down.")


if __name__ == "__main__":
    main()
