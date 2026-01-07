import requests

url = "http://localhost:8002/auth/register_clinic"

# Test data
# Randomize username to avoid 400 error on duplicate
import random

suffix = random.randint(1000, 9999)
data = {
    "clinic_name": f"Test Clinic {suffix}",
    "admin_username": f"testadmin{suffix}",
    "admin_password": "password123",
}

files = {}

try:
    print(f"Sending POST request to {url}...")
    # Timeout increased to check for slow response
    response = requests.post(url, data=data, files=files, timeout=10)

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")

    if response.status_code == 200:
        print("SUCCESS: Registration worked!")
    else:
        print("FAILURE: Backend returned error.")

except Exception as e:
    print(f"EXCEPTION: {e}")
