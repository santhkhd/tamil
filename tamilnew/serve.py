import http.server
import socketserver
import os
import sys

PORT = 8000

# Set active working directory to the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow cross-origin requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        # Prevent browser caching of project files during development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Configure socket to reuse address
    socketserver.TCPServer.allow_reuse_address = True
    
    try:
        with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
            print("==================================================")
            print(f" KoraPlay Movie Web Server Running Successfully ")
            print("==================================================")
            print(f" URL: http://localhost:{PORT}")
            print(" Press Ctrl+C to stop the server.")
            print("==================================================")
            httpd.serve_forever()
    except PermissionError:
        print(f"Error: Port {PORT} is already in use or requires admin access.")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nStopping local server. Goodbye!")
        sys.exit(0)

if __name__ == '__main__':
    main()
