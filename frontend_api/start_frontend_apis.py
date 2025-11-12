"""
Frontend API Startup Script
Launches all frontend APIs for the Healthcare Assistant application
"""

import subprocess
import sys
import time
import os
from pathlib import Path

# Configuration
FRONTEND_APIS = [
    {"name": "Homepage API", "script": "homepage_api.py", "port": 9000},
    {"name": "Clinical Chat Frontend API",
        "script": "clinical_chat_frontend_api.py", "port": 9001},
    {"name": "Document Analyzer Frontend API",
        "script": "document_analyzer_frontend_api.py", "port": 9002},
    {"name": "Organ Analyzer Frontend API",
        "script": "organ_analyzer_frontend_api.py", "port": 9003},
    {"name": "Speech-to-Text Frontend API",
        "script": "speech_to_text_frontend_api.py", "port": 9004},
    {"name": "Text-to-Speech Frontend API",
        "script": "text_to_speech_frontend_api.py", "port": 9005}
]


def print_banner():
    """Print application banner"""
    banner = """
🏥 Healthcare Assistant Frontend APIs
=====================================

This script starts all frontend API servers for the Healthcare Assistant application.

Frontend APIs (Port 9000-9005):
• Homepage API (9000) - Main navigation and homepage
• Clinical Chat Frontend (9001) - Clinical chat interface  
• Document Analyzer Frontend (9002) - PDF/CSV analysis interface
• Organ Analyzer Frontend (9003) - Medical image analysis interface
• Speech-to-Text Frontend (9004) - Audio transcription interface
• Text-to-Speech Frontend (9005) - Translation and TTS interface

Backend APIs (Port 8001-8006):
Make sure backend APIs are running for full functionality.

=====================================
"""
    print(banner)


def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = ["fastapi", "uvicorn", "httpx"]

    print("🔍 Checking dependencies...")

    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} - installed")
        except ImportError:
            print(f"❌ {package} - missing")
            print(f"   Install with: pip install {package}")
            return False

    print("✅ All dependencies satisfied\n")
    return True


def start_api_server(api_info):
    """Start a single API server"""
    script_path = Path(__file__).parent / api_info["script"]

    if not script_path.exists():
        print(f"❌ {api_info['name']} - Script not found: {api_info['script']}")
        return None

    print(f"🚀 Starting {api_info['name']} on port {api_info['port']}...")

    try:
        # Start the API server as a subprocess
        process = subprocess.Popen(
            [sys.executable, str(script_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=script_path.parent
        )

        # Give it a moment to start
        time.sleep(2)

        # Check if process is still running
        if process.poll() is None:
            print(f"✅ {api_info['name']} started successfully")
            print(f"   🌐 Available at: http://localhost:{api_info['port']}")
            print(f"   📚 Docs at: http://localhost:{api_info['port']}/docs")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ {api_info['name']} failed to start")
            print(f"   Error: {stderr}")
            return None

    except Exception as e:
        print(f"❌ {api_info['name']} - Error: {str(e)}")
        return None


def start_all_apis():
    """Start all frontend API servers"""
    print("🚀 Starting Frontend API servers...\n")

    processes = []
    successful_starts = 0

    for api_info in FRONTEND_APIS:
        process = start_api_server(api_info)
        if process:
            processes.append((api_info, process))
            successful_starts += 1
        print()  # Add spacing

    if successful_starts > 0:
        print(
            f"🎉 Successfully started {successful_starts}/{len(FRONTEND_APIS)} frontend APIs")
        print("\n📋 Summary:")
        print("-" * 50)

        for api_info, _ in processes:
            print(f"• {api_info['name']}: http://localhost:{api_info['port']}")

        print(f"\n🔗 Main Homepage: http://localhost:9000")
        print(f"📚 All API Documentation: http://localhost:900X/docs")

        print("\n⚠️ Backend APIs Required:")
        print(
            "Make sure backend APIs (ports 8001-8006) are running for full functionality.")

        print(f"\n🛑 Press Ctrl+C to stop all servers")

        try:
            # Keep the script running and monitor processes
            while True:
                time.sleep(1)
                # Check if any process has died
                for api_info, process in processes:
                    if process.poll() is not None:
                        print(f"\n⚠️  {api_info['name']} has stopped")

        except KeyboardInterrupt:
            print(f"\n\n🛑 Shutting down all frontend API servers...")

            for api_info, process in processes:
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    print(f"✅ {api_info['name']} stopped")
                except subprocess.TimeoutExpired:
                    process.kill()
                    print(f"🔪 {api_info['name']} force killed")
                except Exception as e:
                    print(f"⚠️  Error stopping {api_info['name']}: {str(e)}")

            print("\n👋 All frontend APIs stopped. Goodbye!")

    else:
        print("❌ No frontend APIs could be started. Please check the errors above.")
        return False


def main():
    """Main function"""
    print_banner()

    if not check_dependencies():
        print("\n❌ Please install missing dependencies and try again.")
        return

    start_all_apis()


if __name__ == "__main__":
    main()
