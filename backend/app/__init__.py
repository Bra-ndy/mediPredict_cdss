from flask import Flask, jsonify
from flask_cors import CORS
from config import config
import os
from dotenv import load_dotenv

load_dotenv()

from app.extensions import db, bcrypt, jwt, migrate


def create_app(config_name=None):
    """Application factory function"""
    # Auto-detect config from environment variable if not passed
    if config_name is None:
        config_name = os.getenv('FLASK_CONFIG', 'development')
    
    app = Flask(__name__)
    
    # ===========================
    # LOAD CONFIGURATION
    # ===========================
    app.config.from_object(config[config_name])
    
    # Call config-specific init_app if it exists (for production validation)
    if hasattr(config[config_name], 'init_app'):
        config[config_name].init_app(app)
    
    # ===========================
    # INITIALIZE EXTENSIONS
    # ===========================
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # ===========================
    # CORS CONFIGURATION
    # ===========================
    # Get allowed origins from config
    cors_origins = app.config.get('CORS_ORIGINS', ['*'])
    
    # If it's a string, split by comma
    if isinstance(cors_origins, str):
        cors_origins = [origin.strip() for origin in cors_origins.split(',')]
    
    # Enable CORS with proper settings for JWT auth
    CORS(
        app,
        resources={r"/*": {"origins": cors_origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        expose_headers=["Content-Type", "Authorization"],
        max_age=3600
    )
    
    # ===========================
    # REGISTER BLUEPRINTS
    # ===========================
    from app.routes import main, auth, clinical, contact, disease_routes
    from app.admin import bp as admin_bp
    
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp, url_prefix="/auth")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(clinical.bp)
    app.register_blueprint(contact.bp)
    app.register_blueprint(disease_routes.bp)
    
    # ===========================
    # ENSURE UPLOAD FOLDER EXISTS
    # ===========================
    upload_folder = app.config.get("UPLOAD_FOLDER", "instance/uploads")
    os.makedirs(upload_folder, exist_ok=True)
    
    # ===========================
    # HEALTH CHECK ENDPOINT (for Render)
    # ===========================
    @app.route('/health')
    def health_check():
        """Health check endpoint for Render monitoring"""
        return jsonify({
            'status': 'healthy',
            'service': 'MediPredict CDSS',
            'version': app.config.get('APP_VERSION', '1.0.0')
        }), 200
    
    # ===========================
    # ROOT ENDPOINT
    # ===========================
    @app.route('/')
    def root():
        """Root endpoint"""
        return jsonify({
            'message': 'MediPredict CDSS API',
            'version': app.config.get('APP_VERSION', '1.0.0'),
            'status': 'running'
        }), 200
    
    # ===========================
    # ERROR HANDLERS
    # ===========================
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Resource not found', 'message': str(error)}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'message': str(error)}), 500
    
    # ===========================
    # SHELL CONTEXT FOR FLASK CLI
    # ===========================
    @app.shell_context_processor
    def make_shell_context():
        from app.models import User, Patient, PatientAssessment, ClinicalReport, AuditLog
        return {
            "db": db,
            "User": User,
            "Patient": Patient,
            "Assessment": PatientAssessment,
            "Report": ClinicalReport,
            "AuditLog": AuditLog
        }
    
    # ===========================
    # REQUEST LOGGING (optional, for debugging)
    # ===========================
    if app.config.get('DEBUG', False):
        @app.before_request
        def log_request_info():
            from flask import request
            app.logger.debug(f'{request.method} {request.path}')
    
    return app