#!/usr/bin/env python3
"""
ASGI adapter for Flask 3.x application
Provides better async performance and compatibility with modern ASGI servers
"""

from asgiref.wsgi import WsgiToAsgi
from webapp import app

# Convert Flask WSGI app to ASGI
asgi_app = WsgiToAsgi(app)

if __name__ == "__main__":
    import uvicorn
    
    # Run with uvicorn for better async performance
    uvicorn.run(
        "asgi_app:asgi_app",
        host="127.0.0.1",
        port=5000,
        reload=True,
        log_level="info"
    ) 