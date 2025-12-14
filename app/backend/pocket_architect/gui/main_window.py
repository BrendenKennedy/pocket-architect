"""
Main application window using QWebEngineView to embed React frontend.
Provides Qt Web Channel bridge for React-Python communication.
"""

from pathlib import Path
from PyQt6.QtWidgets import QMainWindow, QVBoxLayout, QWidget
from PyQt6.QtCore import QUrl, QSize
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebChannel import QWebChannel

from pocket_architect.gui.bridge import BackendBridge
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class MainWindow(QMainWindow):
    """Main window that embeds React frontend."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Pocket Architect")
        self.setMinimumSize(QSize(1400, 900))

        # Create web view
        self.web_view = QWebEngineView()

        # Disable caching to ensure latest frontend is loaded
        profile = self.web_view.page().profile()
        profile.setHttpCacheType(profile.HttpCacheType.NoCache)
        profile.setPersistentCookiesPolicy(
            profile.PersistentCookiesPolicy.NoPersistentCookies
        )
        # Clear any existing cache
        profile.clearHttpCache()

        # Setup web channel for React-Python bridge
        self.bridge = BackendBridge()
        self.channel = QWebChannel()
        self.channel.registerObject("backend", self.bridge)
        self.web_view.page().setWebChannel(self.channel)

        # Connect to web view signals for error handling
        self._connect_signals()

        # Load React frontend
        self._load_frontend()

        # Set web view as central widget
        central_widget = QWidget()
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.web_view)
        self.setCentralWidget(central_widget)

        # Add keyboard shortcuts
        self._setup_shortcuts()

    def _load_frontend(self):
        """Load the React frontend from built files or development server."""
        import pocket_architect

        # Try to load from built files first (production mode)
        package_path = Path(pocket_architect.__file__).parent
        frontend_index = package_path / "resources" / "frontend" / "index.html"

        if frontend_index.exists():
            file_url = QUrl.fromLocalFile(str(frontend_index))
            self.web_view.setUrl(file_url)
            logger.info(f"Loading from built files at {file_url.toString()}")
        else:
            # Fallback to development server
            dev_url = QUrl("http://localhost:3000")
            self.web_view.setUrl(dev_url)
            logger.info(
                "Loading from development server at http://localhost:3000 (built files not found)"
            )

    def _connect_signals(self):
        """Connect to web view signals for error handling and debugging."""
        # Connect load finished signal
        self.web_view.loadFinished.connect(self._on_load_finished)

        # Connect JavaScript console messages for debugging
        self.web_view.page().javaScriptConsoleMessage = self._on_js_console_message

    def _on_load_finished(self, success):
        """Handle web page load completion."""
        if not success:
            url = self.web_view.url().toString()
            logger.error("🚨 CRITICAL: Frontend failed to load!")
            logger.error(f"Failed URL: {url}")

            # Show error dialog
            from PyQt6.QtWidgets import QMessageBox

            QMessageBox.critical(
                self,
                "Load Error",
                f"Failed to load frontend from:\n{url}\n\n"
                "This usually indicates:\n"
                "• Built frontend files are missing (run build first)\n"
                "• Development server is not running\n"
                "• Qt WebEngine setup issues\n\n"
                "Check the application logs for more details.",
            )
        else:
            logger.info("Frontend loaded successfully")

    def _on_js_console_message(self, level, message, line_number, source_id):
        """Capture JavaScript console messages for debugging."""
        level_name = {0: "INFO", 1: "WARNING", 2: "ERROR"}.get(level, "UNKNOWN")

        log_message = f"JS {level_name}: {message}"
        if source_id:
            log_message += f" ({source_id}:{line_number})"

        if level == 2:  # Error
            logger.error(f"🚨 {log_message}")
        elif level == 1:  # Warning
            logger.warning(log_message)
        else:  # Info
            logger.info(log_message)

    def _setup_shortcuts(self):
        """Setup keyboard shortcuts."""
        from PyQt6.QtGui import QShortcut, QKeySequence

        # Ctrl+Q to quit
        quit_shortcut = QShortcut(QKeySequence("Ctrl+Q"), self)
        quit_shortcut.activated.connect(self.close)

    def cleanup(self):
        """Perform cleanup operations before application shutdown."""
        logger.info("MainWindow cleanup initiated")

        try:
            # Stop any ongoing web page operations
            if self.web_view:
                self.web_view.stop()
                logger.debug("Web view stopped")

            # Clear web cache
            if self.web_view and self.web_view.page():
                profile = self.web_view.page().profile()
                profile.clearHttpCache()
                logger.debug("Web cache cleared")

            # Clean up the bridge (this will close any open database connections)
            if self.bridge:
                self.bridge.cleanup()
                logger.debug("Backend bridge cleaned up")

            # Additional cleanup can be added here as needed
            logger.info("MainWindow cleanup completed")

        except Exception as e:
            logger.error(f"Error during MainWindow cleanup: {e}")
            import traceback

            traceback.print_exc()

    def closeEvent(self, event):
        """Handle window close event."""
        logger.info("MainWindow close event received")

        # Simple confirmation dialog
        from PyQt6.QtWidgets import QMessageBox

        reply = QMessageBox.question(
            self,
            "Confirm Exit",
            "Are you sure you want to exit Pocket Architect?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )

        if reply == QMessageBox.StandardButton.Yes:
            logger.info("User confirmed exit, proceeding with cleanup")
            self.cleanup()
            event.accept()
        else:
            logger.info("User cancelled exit")
            event.ignore()
