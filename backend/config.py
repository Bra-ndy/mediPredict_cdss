import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')

    # ===========================
    # DATABASE CONFIGURATION
    # ===========================
    # Render provides DATABASE_URL starting with postgres://
    # SQLAlchemy requires postgresql://
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///instance/app.db')
    
    # Convert postgres:// to postgresql:// for SQLAlchemy compatibility (Render)
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Connection pooling (only for PostgreSQL; SQLite ignores these)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 299,
        'pool_timeout': 20,
        'pool_pre_ping': True
    }

    # ===========================
    # JWT CONFIGURATION
    # ===========================
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ERROR_MESSAGE_KEY = 'message'

    # ===========================
    # CORS CONFIGURATION
    # ===========================
    CORS_ORIGINS = os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://localhost:5000'
    ).split(',')

    # ===========================
    # MAIL SETTINGS
    # ===========================
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@medipredict.com')

    # ===========================
    # FILE UPLOADS
    # ===========================
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'instance/uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    # ===========================
    # ML MODEL PATHS
    # ===========================
    # Build absolute paths to avoid issues in different working directories
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    ML_MODEL_PATH = os.environ.get(
        'ML_MODEL_PATH',
        os.path.join(BASE_DIR, 'ml', 'models', 'drug_model.joblib')
    )
    ML_ENCODER_PATH = os.environ.get(
        'ML_ENCODER_PATH',
        os.path.join(BASE_DIR, 'ml', 'models')
    )

    # ===========================
    # PAGINATION
    # ===========================
    ITEMS_PER_PAGE = int(os.environ.get('ITEMS_PER_PAGE', 10))

    # ===========================
    # APPLICATION SETTINGS
    # ===========================
    APP_NAME = "MediPredict CDSS"
    APP_VERSION = "1.0.0"

    # ===========================
    # SECURITY
    # ===========================
    BCRYPT_LOG_ROUNDS = 13
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = True  # Log SQL queries
    MAIL_SUPPRESS_SEND = False  # Actually send emails in dev


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    PRESERVE_CONTEXT_ON_EXCEPTION = False
    MAIL_SUPPRESS_SEND = True  # Don't send emails during tests
    UPLOAD_FOLDER = 'instance/test_uploads'


class ProductionConfig(Config):
    """Production configuration (used on Render)."""
    DEBUG = False
    TESTING = False
    SQLALCHEMY_ECHO = False

    # Production security settings
    SESSION_COOKIE_SECURE = True
    REMEMBER_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None'  # Required for cross-domain cookies

    # Production email settings
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'false').lower() == 'true'
    if MAIL_USE_SSL:
        MAIL_PORT = int(os.environ.get('MAIL_PORT', 465))
        MAIL_USE_TLS = False

    @classmethod
    def init_app(cls, app):
        """Validate production-specific settings at startup."""
        # These are checked AFTER the app is created
        # so it doesn't crash during imports
        missing = []
        if not os.environ.get('SECRET_KEY'):
            missing.append('SECRET_KEY')
        if not os.environ.get('JWT_SECRET_KEY'):
            missing.append('JWT_SECRET_KEY')
        if not os.environ.get('DATABASE_URL'):
            missing.append('DATABASE_URL')

        if missing:
            raise ValueError(
                f"Missing required environment variables in production: {', '.join(missing)}"
            )


class StagingConfig(ProductionConfig):
    """Staging configuration (between development and production)."""
    DEBUG = True
    TESTING = False
    SQLALCHEMY_ECHO = False

    # Staging can use development-like settings but with production database
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False


# ===========================
# CONFIGURATION DICTIONARY
# ===========================
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}