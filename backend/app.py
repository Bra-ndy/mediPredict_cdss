import os
from app import create_app

# Create Flask app
app = create_app(os.getenv('FLASK_CONFIG') or 'production')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.getenv('FLASK_CONFIG', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)