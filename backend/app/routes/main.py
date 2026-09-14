from flask import Blueprint, jsonify, current_app
from datetime import datetime
import platform
import os

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Root endpoint - API information"""
    return jsonify({
        'message': 'Welcome to Healthcare Drug Recommendation API',
        'version': current_app.config.get('APP_VERSION', '1.0'),
        'name': current_app.config.get('APP_NAME', 'MediPredict CDSS'),
        'status': 'operational',
        'timestamp': datetime.utcnow().isoformat()
    })

@bp.route('/health')
def health():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'backend',
        'timestamp': datetime.utcnow().isoformat()
    })

@bp.route('/about')
def about():
    """About information for the API"""
    return jsonify({
        'name': 'MediPredict CDSS',
        'version': current_app.config.get('APP_VERSION', '1.0'),
        'description': 'Clinical Decision Support System powered by machine learning',
        'features': [
            'AI-powered drug recommendations',
            'Patient management',
            'Clinical assessments',
            'Professional verification',
            'Audit logging'
        ],
        'technologies': ['Flask', 'SQLAlchemy', 'scikit-learn', 'React'],
        'contact': {
            'email': 'support@medipredict.com',
            'website': 'https://medipredict.com'
        }
    })

@bp.route('/system-info')
def system_info():
    """System information (for debugging)"""
    return jsonify({
        'python_version': platform.python_version(),
        'platform': platform.platform(),
        'environment': current_app.config.get('ENV', 'production'),
        'debug': current_app.debug,
        'database': str(current_app.config.get('SQLALCHEMY_DATABASE_URI', '')).split('://')[0] + '://...',
        'timezone': str(datetime.now().astimezone().tzinfo)
    })

@bp.route('/ping')
def ping():
    """Simple ping endpoint for connectivity testing"""
    return jsonify({'pong': True})
