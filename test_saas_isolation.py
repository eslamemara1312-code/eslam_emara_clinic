import urllib.request
import urllib.parse
import urllib.error
import json
import random

BASE_URL = "http://127.0.0.1:8001"

def post(url, data, headers={}):
    req = urllib.request.Request(f"{BASE_URL}{url}", data=json.dumps(data).encode("utf-8"), headers={**headers, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        print(f"Request Error: {e}")
        return 500, str(e)

def get(url, headers={}):
    req = urllib.request.Request(f"{BASE_URL}{url}", headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return response.getcode(), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 500, str(e)

def register_clinic(name, username, password):
    print(f"Registering clinic: {name} with admin: {username}")
    payload = {
        "clinic_name": name,
        "admin_username": username,
        "admin_password": password
    }
    code, resp = post("/auth/register_clinic", payload)
    if code == 200:
        print(" -> Success")
        return resp["access_token"]
    else:
        print(f" -> Failed: {code} - {resp}")
        return None

def create_patient(token, name, phone):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": name, "phone": phone, "age": 30}
    code, resp = post("/patients/", payload, headers)
    if code == 200:
        return resp["id"]
    else:
        print(f"Failed to create patient: {code} - {resp}")
        return None

def get_patient_status(token, patient_id):
    headers = {"Authorization": f"Bearer {token}"}
    code, resp = get(f"/patients/{patient_id}", headers)
    return code

def main():
    print("--- Starting SaaS Isolation Test ---")
    
    # Use random suffix to verify repeat runs
    suffix = str(random.randint(1000, 9999))
    
    # 1. Register Clinic A
    token_a = register_clinic(f"Clinic A {suffix}", f"admin_a_{suffix}", "pass123")
    if not token_a: exit(1)
    
    # 2. Register Clinic B
    token_b = register_clinic(f"Clinic B {suffix}", f"admin_b_{suffix}", "pass123")
    if not token_b: exit(1)

    # 3. Clinic A creates a patient
    print("\n[Clinic A] Creating Patient 'Patient A'...")
    patient_a_id = create_patient(token_a, "Patient A", "555-0001")
    if not patient_a_id: exit(1)
    print(f" -> Created Patient ID: {patient_a_id}")

    # 4. Clinic A reads its patient (Control)
    print("\n[Clinic A] Reading Patient A...")
    status_a = get_patient_status(token_a, patient_a_id)
    if status_a == 200:
        print(" -> Success (Expected)")
    else:
        print(f" -> Failed: {status_a} (Unexpected)")

    # 5. Clinic B tries to read Clinic A's patient
    print("\n[Clinic B] Attempting to read Patient A (Should Fail)...")
    status_b = get_patient_status(token_b, patient_a_id)
    if status_b == 404:
        print(" -> Success: Access Denied (404 Not Found) - ISOLATION VERIFIED")
    else:
        print(f" -> FAILED: Clinic B could access Patient A! Status: {status_b}")

if __name__ == "__main__":
    main()
