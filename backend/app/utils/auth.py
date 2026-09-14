from flask import Blueprint, request, jsonify, current_app
from app.models import User
from app import db, bcrypt
from datetime import datetime, timedelta
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

bp = Blueprint('auth', __name__)

@bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email and password are required'}), 400

        # Find user by email
        user = User.query.filter_by(email=data.get('email')).first()

        # Check if user exists
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401

        # Check if account is locked (if you have this feature)
        if hasattr(user, 'is_locked') and user.is_locked():
            lock_time = user.locked_until.strftime('%H:%M')
            return jsonify({
                'message': f'Account is locked due to too many failed attempts. Try again after {lock_time}'
            }), 401

        # Check password
        if not user.check_password(data.get('password')):
            # Record failed login attempt if method exists
            if hasattr(user, 'record_failed_login'):
                user.record_failed_login()
            return jsonify({'message': 'Invalid email or password'}), 401

        # Reset failed login attempts on successful login
        if hasattr(user, 'reset_failed_login'):
            user.reset_failed_login()

        # Update last login info
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = request.remote_addr
        db.session.commit()

        # Generate token using Flask-JWT-Extended (uses JWT_SECRET_KEY from config)
        access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=24))

        # Return user info (excluding sensitive data)
        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'role': user.role,
                'specialization': user.specialization,
                'license_number': user.license_number,
                'institution': user.institution,
                'is_verified': user.is_verified,
                'is_active': user.is_active,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@bp.route('/signup', methods=['POST'])
def signup():
    """User registration endpoint"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['full_name', 'email', 'password', 'license_number']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'{field} is required'}), 400

        # Check if user already exists
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'message': 'Email already registered'}), 400

        if User.query.filter_by(license_number=data.get('license_number')).first():
            return jsonify({'message': 'License number already registered'}), 400

        # Create new user
        user = User(
            full_name=data.get('full_name'),
            email=data.get('email'),
            license_number=data.get('license_number'),
            institution=data.get('institution', ''),
            specialization=data.get('specialization', ''),
            professional_id=data.get('professional_id', ''),
            role='pending',  # Requires admin verification
            is_active=False,
            is_verified=False
        )

        # Set password
        user.set_password(data.get('password'))

        # Save to database
        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'Registration successful! Your account requires administrator verification before you can access the system.',
            'user_id': user.id
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'message': f'Registration failed: {str(e)}'}), 500

@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset email"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'message': 'Email is required'}), 400

        user = User.query.filter_by(email=email).first()

        # Always return success to prevent email enumeration
        if user and hasattr(user, 'generate_reset_token'):
            # Generate reset token (keep your existing reset token logic)
            token = user.generate_reset_token()
            print(f"Password reset token for {email}: {token}")  # For testing

        return jsonify({
            'message': 'If your email exists in our system, you will receive a password reset link shortly.'
        }), 200

    except Exception as e:
        return jsonify({'message': f'Failed to process request: {str(e)}'}), 500

@bp.route('/validate-reset-token/<token>', methods=['GET'])
def validate_reset_token(token):
    """Validate password reset token"""
    try:
        # Find user with this token
        user = User.query.filter_by(reset_token=token).first()

        if not user or not hasattr(user, 'verify_reset_token') or not user.verify_reset_token(token):
            return jsonify({'valid': False, 'message': 'Invalid or expired token'}), 400

        return jsonify({'valid': True}), 200

    except Exception as e:
        return jsonify({'valid': False, 'message': str(e)}), 500

@bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password using token"""
    try:
        data = request.get_json()
        new_password = data.get('password')

        if not new_password or len(new_password) < 6:
            return jsonify({'message': 'Password must be at least 6 characters'}), 400

        # Find user with this token
        user = User.query.filter_by(reset_token=token).first()

        if not user or not hasattr(user, 'verify_reset_token') or not user.verify_reset_token(token):
            return jsonify({'message': 'Invalid or expired reset token'}), 400

        # Set new password
        user.set_password(new_password)

        # Clear reset token
        if hasattr(user, 'clear_reset_token'):
            user.clear_reset_token()

        db.session.commit()

        return jsonify({'message': 'Password reset successful! You can now login with your new password.'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to reset password: {str(e)}'}), 500

@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    # JWT tokens are stateless, so we just return success
    return jsonify({'message': 'Logout successful'}), 200

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user info"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(int(current_user_id))
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        return jsonify({
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'specialization': user.specialization,
            'license_number': user.license_number,
            'institution': user.institution,
            'is_verified': user.is_verified,
            'is_active': user.is_active,
            'created_at': user.created_at.isoformat() if user.created_at else None
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500