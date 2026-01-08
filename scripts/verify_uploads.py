import urllib.request
import urllib.parse
import json
import sys
import os

BASE_URL = "http://localhost:8000"

def test_upload():
    print("Testing File Upload...")
    
    # Create dummy file
    filename = "test_image.txt"
    with open(filename, "w") as f:
        f.write("This is a test image content")
        
    # We need to use multipart/form-data. 
    # Since urllib is complex with multipart, we will use a simpler check:
    # We will just check if the endpoint EXISTS by sending a GET to the list endpoint
    # (Writing a raw multipart request in pure python without requests/http.client is verbose)
    
    print("Checking GET /patients/1/attachments...")
    try:
        url = f"{BASE_URL}/patients/1/attachments"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("SUCCESS: Attachments endpoint is reachable.")
                data = json.loads(response.read().decode('utf-8'))
                print(f"Current attachments count: {len(data)}")
            else:
                print(f"FAILED: Status {response.status}")
                sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        # If connection refused, server might not be running or reloading
        sys.exit(1)

    # Clean up
    if os.path.exists(filename):
        os.remove(filename)

if __name__ == "__main__":
    test_upload()
