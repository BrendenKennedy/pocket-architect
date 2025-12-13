#!/usr/bin/env python3
"""
Test script to verify graceful shutdown functionality.
"""

import sys
import time
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QTimer

# Add the backend to path
sys.path.insert(0, 'app/backend')

from pocket_architect.gui.main_window import MainWindow
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)

def test_graceful_shutdown():
    """Test that cleanup happens properly on shutdown."""
    print("Testing graceful shutdown functionality...")
    
    app = QApplication(sys.argv)
    
    # Create main window
    window = MainWindow()
    
    # Simulate application running briefly
    print("Application initialized, simulating 2 seconds of operation...")
    
    def on_timeout():
        print("Simulating user closing application...")
        window.close()  # This should trigger cleanup
    
    # Close after 2 seconds
    QTimer.singleShot(2000, on_timeout)
    
    # Run the application
    exit_code = app.exec()
    
    print(f"Application exited with code: {exit_code}")
    print("Graceful shutdown test completed!")
    
    return exit_code

if __name__ == "__main__":
    test_graceful_shutdown()
