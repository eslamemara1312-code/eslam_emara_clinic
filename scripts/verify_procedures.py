import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:8000"

def request(method, endpoint, data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if data:
        data_bytes = json.dumps(data).encode('utf-8')
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                print(f"FAILED: {method} {endpoint} - Status {response.status}")
                sys.exit(1)
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"FAILED: {method} {endpoint} - {e}")
        print(e.read().decode('utf-8'))
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

def test_procedures():
    print("Testing Procedures API...")
    
    # 1. Create
    payload = {"name": "Test Extraction", "price": 500.0}
    response = request("POST", "/procedures/", payload)
    proc_id = response["id"]
    print(f"SUCCESS: Created procedure {proc_id}")
    
    # 2. Get List
    procs = request("GET", "/procedures/")
    found = any(p["id"] == proc_id for p in procs)
    if not found:
        print("FAILED: Procedure not found in list")
        sys.exit(1)
    print(f"SUCCESS: Procedure found in list. Total count: {len(procs)}")
    
    # 3. Update
    update_payload = {"name": "Updated Extraction", "price": 600.0}
    response = request("PUT", f"/procedures/{proc_id}", update_payload)
    
    if response["name"] != "Updated Extraction" or response["price"] != 600.0:
        print("FAILED: Values not updated")
        print(response)
        sys.exit(1)
    print("SUCCESS: Updated procedure")
    
    # 4. Delete
    request("DELETE", f"/procedures/{proc_id}")
    print("SUCCESS: Deleted procedure")

    print("\nALL TESTS PASSED")

if __name__ == "__main__":
    test_procedures()
