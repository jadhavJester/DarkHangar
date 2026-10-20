"""Tests for app_launcher.py port/server-wait helpers.

The desktop launcher must find a free port and wait for the backend to
accept connections; these helpers are pure socket logic and are pinned
here without starting the real server.
"""

import importlib.util
import socket
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "app_launcher",
    Path(__file__).resolve().parents[1] / "app_launcher.py")
launcher = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(launcher)


def test_find_free_port_returns_bindable_port_at_or_after_start():
    port = launcher._find_free_port(18765)
    assert 18765 <= port < 18765 + 100
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", port))  # must actually be free


def test_find_free_port_skips_occupied_ports():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as blocker:
        blocker.bind(("127.0.0.1", 18770))
        blocker.listen(1)
        port = launcher._find_free_port(18770)
        assert port != 18770


def test_wait_for_server_times_out_on_closed_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        free_port = s.getsockname()[1]
    assert launcher._wait_for_server(free_port, timeout=0.6) is False


def test_wait_for_server_true_when_listening():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.bind(("127.0.0.1", 0))
        srv.listen(1)
        port = srv.getsockname()[1]
        assert launcher._wait_for_server(port, timeout=2.0) is True
