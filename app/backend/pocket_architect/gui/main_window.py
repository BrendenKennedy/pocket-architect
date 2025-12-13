"""
Main application window using QWebEngineView to embed React frontend.
Provides Qt Web Channel bridge for React-Python communication.
"""

from pathlib import Path
from PySide6.QtWidgets import QMainWindow, QVBoxLayout, QWidget
from PySide6.QtCore import QUrl, QSize
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebChannel import QWebChannel

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
        """Load the built React frontend."""
        # Find the built frontend
        resources_dir = Path(__file__).parent.parent / "resources" / "frontend"
        index_html = resources_dir / "index.html"

        if index_html.exists():
            url = QUrl.fromLocalFile(str(index_html.absolute()))
            self.web_view.setUrl(url)
            logger.info(f"Loaded frontend from {index_html}")
        else:
            logger.warning(
                f"Frontend not found at {index_html}, loading from development server"
            )
            # Load from development server
            dev_url = QUrl("http://localhost:3000")
            self.web_view.setUrl(dev_url)
            logger.info("Loading from development server at http://localhost:3000")

    def _setup_shortcuts(self):
        """Setup keyboard shortcuts."""
        from PySide6.QtGui import QShortcut, QKeySequence

        # Ctrl+Q to quit
        quit_shortcut = QShortcut(QKeySequence.Quit, self)
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
        from PySide6.QtWidgets import QMessageBox

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
