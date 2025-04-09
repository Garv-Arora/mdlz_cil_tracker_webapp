# CIL Tracker - Mondelez India Pvt. Ltd.

A web application for tracking CIL (Cleaning, Inspection, and Lubrication) activities at the Sricity Plant.

## Features

- Track CIL activities for different production lines
- Record start and stop times for each session
- Export data to Excel or CSV format
- 30-day data retention
- Production-ready deployment

## Deployment Guide

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Network access to the deployment server

### Installation

1. Clone or download the application code to your server

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

### Configuration

The application can be configured using environment variables:

- `CIL_HOST`: The host address to bind to (default: '0.0.0.0')
- `CIL_PORT`: The port to run on (default: 8080)
- `CIL_DB_PATH`: Database connection string (default: 'sqlite:///cil_tracker.db')
- `FLASK_ENV`: Set to 'development' for debug mode, or 'production' for production mode

### Running in Production

1. Set the environment variables (if needed):
```bash
# Windows PowerShell
$env:CIL_PORT = "80"
$env:FLASK_ENV = "production"

# Linux/Mac
export CIL_PORT=80
export FLASK_ENV=production
```

2. Start the application:
```bash
python app.py
```

The application will start on the specified port with the production server (Waitress).

### Alternative Deployment with Gunicorn (Linux/Unix only)

For Linux/Unix systems, you can also use Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

### Accessing the Application

Once deployed, users can access the application by navigating to:
```
http://[server-ip]:[port]
```

Replace [server-ip] with your server's IP address or hostname, and [port] with the configured port number.

### Data Management

- The application automatically maintains a 30-day rolling window of data
- Older data is automatically cleaned up
- Data is stored in an SQLite database by default
- Export functionality allows downloading data in Excel or CSV format

### Security Considerations

1. The application should be deployed behind a reverse proxy (like Nginx or Apache) in production
2. Configure HTTPS for secure data transmission
3. Consider implementing authentication if needed
4. Ensure proper file permissions on the database file

### Troubleshooting

If you encounter issues:

1. Check the server logs for error messages
2. Verify network connectivity and firewall settings
3. Ensure proper permissions on the database file and directory
4. Confirm all required dependencies are installed correctly

For additional support or issues, please contact the IT support team. 