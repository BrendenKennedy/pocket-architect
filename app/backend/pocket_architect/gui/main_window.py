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
            logger.warning(f"Frontend not found at {index_html}, loading from development server")
            # Load from development server
            dev_url = QUrl("http://localhost:3000")
            self.web_view.setUrl(dev_url)
            logger.info("Loading from development server at http://localhost:3000")
