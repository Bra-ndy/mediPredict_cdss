from flask import Blueprint

admin = Blueprint('admin', __name__)

bp = admin

from app.admin import routes
