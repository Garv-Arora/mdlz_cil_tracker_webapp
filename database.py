from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os

db = SQLAlchemy()

class WorkSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    line = db.Column(db.String(10), nullable=False)
    leg = db.Column(db.String(10), nullable=False)
    machine = db.Column(db.String(10), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, nullable=True)  # Duration in seconds
    abh_detected = db.Column(db.Integer, nullable=True)  # Number of ABH detected

    def to_dict(self):
        # Adjust time by 5 hours and 30 minutes
        adjusted_start_time = self.start_time + timedelta(hours=5, minutes=30)
        adjusted_end_time = self.end_time + timedelta(hours=5, minutes=30) if self.end_time else None

        return {
            'id': self.id,
            'name': self.name,
            'line': self.line,
            'leg': self.leg,
            'machine': self.machine,
            'start_time': adjusted_start_time.strftime('%Y-%m-%d %H:%M:%S'),
            'end_time': adjusted_end_time.strftime('%Y-%m-%d %H:%M:%S') if adjusted_end_time else None,
            'duration': self.duration,
            'abh_detected': self.abh_detected
        }

    @classmethod
    def cleanup_old_data(cls, retention_days=30):
        """Remove data older than retention_days"""
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        cls.query.filter(cls.start_time < cutoff_date).delete()
        db.session.commit()

    @classmethod
    def get_sessions_for_export(cls, start_date, end_date):
        """Get sessions within date range"""
        # Adjust end_date to include the entire day
        end_date = end_date + timedelta(days=1)
        return cls.query.filter(
            cls.start_time >= start_date,
            cls.start_time < end_date,
            cls.end_time.isnot(None)  # Only include completed sessions
        ).order_by(cls.start_time.desc()).all() 
