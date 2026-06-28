"""
AethOS Prime - UI Bridge (Flask + PyWebView + Win32API)
=======================================================

This module serves as the primary communication bridge between the Python Neural Kernel
and the React/Vite Frontend.

Key Mechanisms:
1. `Socket.IO`: Streams telemetry at 250ms intervals (`system_state` event).
2. `PyWebView`: Spawns a lightweight Chromium/Edge EdgeHTML window to render the UI locally
   without needing a full web browser.
3. `Win32 CTypes`: Directly hooks into the Desktop Window Manager (DWM) via `WM_SETICON`
   to forcefully overwrite the taskbar and titlebar icons with the AethOS Infinity logo.
"""
import os
import threading
import time
import logging
import ctypes
from flask import Flask, render_template
from flask_socketio import SocketIO

# Import the native window wrapper
try:
    import webview
    WEBVIEW_AVAILABLE = True
except ImportError:
    WEBVIEW_AVAILABLE = False
    print("[WARNING] pywebview not installed. Will fallback to default browser.")

class API:
    """Handles semantic database interactions."""
    def __init__(self, db, kg):
        self._db = db
        self._kg = kg

    def search(self, query):
        if not self._db or not self._db.vectors is not None:
            return [{"filename": "System", "score": 0, "preview": "Index is building..."}]

        raw_results = self._db.search(query, top_k=20)
        aggregated = {}
        for res in raw_results:
            base_filename = res['filename'].split('::chunk_')[0]
            if base_filename not in aggregated or res['score'] > aggregated[base_filename]['score']:
                aggregated[base_filename] = {
                    "filename": base_filename,
                    "score": res['score'],
                    "preview": res['preview'].replace('\n', ' ').strip()
                }

        sorted_unique = sorted(list(aggregated.values()), key=lambda x: x['score'], reverse=True)
        return sorted_unique[:10]

    def get_context(self, filename):
        if not self._kg: return {}
        graph_id = f"{filename}::chunk_0"
        raw_neighbors = self._kg.get_neighbors(graph_id)

        clean_neighbors = {}
        for neighbor_id, data in raw_neighbors.items():
            clean_name = neighbor_id.split('::chunk_')[0]
            clean_neighbors[clean_name] = data

        return clean_neighbors

class UIBridge:
    """
    The Presentation Orchestrator.
    Manages the Flask server and the Native Application Shell.
    """
    def __init__(self, kernel, db, kg, config):
        self.kernel = kernel
        self.config = config
        self._is_closing = False

        # --- ARCHITECTURAL FIX: React SPA Hosting ---
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # We serve directly from the frontend/dist folder to avoid requiring a copy step.
        # This couples the backend to the frontend directory structure, but drastically
        # improves the developer experience for open-source contributors.
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..', '..'))
        self.assets_dir = os.path.join(project_root, 'frontend', 'dist')
        
        # static_url_path='' maps the root URL directly to the assets folder
        self.app = Flask(__name__, static_folder=self.assets_dir, static_url_path='')
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        self.api = API(db, kg)

        # 1. The SPA Catch-All Route
        # React handles its own URL paths. Flask must return index.html for EVERYTHING,
        # unless the request is for a specific .js or .css file that exists on disk.
        @self.app.route('/', defaults={'path': ''})
        @self.app.route('/<path:path>')
        def serve_react_app(path):
            if path != "" and os.path.exists(os.path.join(self.assets_dir, path)):
                return self.app.send_static_file(path)
            else:
                return self.app.send_static_file('index.html')

        @self.socketio.on('connect')
        def handle_connect():
            self.socketio.emit('initial_config', self.kernel.config.settings)

        @self.socketio.on('search')
        def handle_search(query):
            self.socketio.emit('search_results', self.api.search(query))

        @self.socketio.on('get_context')
        def handle_get_context(filename):
            import os
            neighbors = self.api.get_context(filename)
            formatted_neighbors = []
            for n_name, n_data in neighbors.items():
                formatted_neighbors.append([n_name, n_data['weight']])

            clean_target = os.path.basename(filename)
            self.socketio.emit('context_results', {"target": clean_target, "neighbors": formatted_neighbors})
            
        @self.socketio.on('get_file_content')
        def handle_get_file_content(filepath):
            import os
            try:
                if os.path.exists(filepath):
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.socketio.emit('file_content_result', {"filepath": filepath, "content": content})
                else:
                    self.socketio.emit('file_content_result', {"filepath": filepath, "content": "File not found on disk."})
            except Exception as e:
                self.socketio.emit('file_content_result', {"filepath": filepath, "content": f"Error reading file: {e}"})

        @self.socketio.on('update_setting')
        def handle_setting(data):
            key = data.get('key')
            val = data.get('value')
            
            if key == "memory_wipe":
                logging.warning("[SYSTEM] INITIATING FULL MEMORY WIPE...")
                try:
                    for f in ["storage/index.json", "storage/graph.json", "storage/brain.pth"]:
                        if os.path.exists(f): os.remove(f)
                    self.socketio.emit('factory_reset_success')
                    logging.warning("[SYSTEM] Memory wiped. Restart required.")
                    time.sleep(1)
                    os._exit(0)
                except Exception as e:
                    logging.error(f"[SYSTEM] Failed to wipe memory: {e}")
                return

            if key in ["custom_whitelist", "ignored_dirs"]:
                if isinstance(val, str):
                    val = [item.strip().lower() for item in val.split(',') if item.strip()]

            if key == "safe_mode":
                self.kernel.safe_mode = val
                self.kernel.config.set("safe_mode", val)
                if val: logging.warning("System entered SAFE MODE (UI Trigger).")
                else: logging.info("System resumed ACTIVE MODE (UI Trigger).")
            elif key == "power_mode":
                if hasattr(self.kernel, 'scheduler'):
                    self.kernel.config.set("power_mode", val)
                    self.kernel.power_manager.apply_mode(val, self.kernel.scheduler)
            else:
                self.kernel.config.set(key, val)
            
        @self.socketio.on('select_folder')
        def handle_select_folder():
            if WEBVIEW_AVAILABLE and len(webview.windows) > 0:
                result = webview.windows[0].create_file_dialog(webview.FOLDER_DIALOG) # type: ignore
                if result and len(result) > 0:
                    path = result[0]
                    self.socketio.emit('folder_selected', path)

        @self.socketio.on('select_log_folder')
        def handle_select_log_folder():
            if WEBVIEW_AVAILABLE and len(webview.windows) > 0:
                result = webview.windows[0].create_file_dialog(webview.FOLDER_DIALOG) # type: ignore
                if result and len(result) > 0:
                    path = result[0]
                    self.socketio.emit('log_folder_selected', path)


        @self.socketio.on('clear_paths')
        def handle_clear_paths():
            self.kernel.config.set('index_directory', '')
            self.kernel.config.set('log_export_path', '')
            self.socketio.emit('initial_config', self.kernel.config._config)
            logging.info("[SYSTEM] Semantic paths and log paths cleared by user.")

        @self.socketio.on('update_index_directory')
        def handle_index_directory(path):
            from aethos.storage.indexer import LocalIndexer
            def run_indexer():
                indexer = LocalIndexer(self.api._db, self.api._kg, config=self.kernel.config)
                indexer.scan_directory(path)
                self.socketio.emit('indexing_complete', path)
            threading.Thread(target=run_indexer, daemon=True).start()

    def _run_server(self):
        """Runs the Flask-SocketIO server in a background thread."""
        self.socketio.run(self.app, host='127.0.0.1', port=5000, log_output=False, debug=False)

    def launch(self):
        """Orchestrates the threads and spawns the Native App Shell."""

        # 1. Start the Kernel AI loop (Daemon Thread)
        threading.Thread(target=self.kernel.boot, daemon=True).start()

        # 2. Start the Web Server (Daemon Thread)
        threading.Thread(target=self._run_server, daemon=True).start()

        # Give the server 1 second to bind to port 5000
        time.sleep(1)

        # 3. Force Windows to use our Icon for the Taskbar
        if os.name == 'nt':
            try:
                myappid = 'aethos.prime.core.1'
                ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
            except Exception as e:
                logging.warning(f"Could not set AppUserModelID: {e}")

        # 4. Spawn the Native Window (Blocks Main Thread)
        if WEBVIEW_AVAILABLE:
            print("🚀 Launching AethOS Native Shell...")
            window = webview.create_window(
                'AethOS Prime',
                url='http://127.0.0.1:5000',
                width=1440,
                height=900,
                min_size=(1440, 900),
                background_color='#0f172a',
                frameless=False
            )

            window.events.closed += self.on_window_closed # type: ignore
            window.events.shown += self.on_window_shown # type: ignore
            webview.start()
        else:
            import webbrowser
            print("🚀 AethOS Web Interface: http://127.0.0.1:5000")
            webbrowser.open('http://127.0.0.1:5000')
            while not self._is_closing:
                time.sleep(1)

    def on_window_shown(self):
        # Force Window Icon via Win32 API since pywebview struggles with Python scripts
        if os.name == 'nt':
            import ctypes
            try:
                hwnd = ctypes.windll.user32.FindWindowW(None, "AethOS Prime")
                if hwnd:
                    icon_path = os.path.join(self.assets_dir, 'logo.ico')
                    LR_LOADFROMFILE = 0x0010
                    IMAGE_ICON = 1
                    WM_SETICON = 0x0080
                    hinst = ctypes.windll.kernel32.GetModuleHandleW(None)
                    hicon = ctypes.windll.user32.LoadImageW(hinst, icon_path, IMAGE_ICON, 0, 0, LR_LOADFROMFILE)
                    if hicon:
                        ctypes.windll.user32.SendMessageW(hwnd, WM_SETICON, 0, hicon) # ICON_SMALL
                        ctypes.windll.user32.SendMessageW(hwnd, WM_SETICON, 1, hicon) # ICON_BIG
            except Exception as e:
                logging.warning(f"Failed to force window icon: {e}")

    def on_window_closed(self):
        print("[UI] Application Shell closed. Initiating Kernel shutdown...")
        self._is_closing = True
        self.kernel.running = False

    def update_view(self, payload):
        if self._is_closing:
            return
        try:
            self.socketio.emit('update_dashboard', payload)
        except Exception as e:
            print(f"[UI Bridge] Socket Error: {e}")
            self._is_closing = True
            self.kernel.running = False
