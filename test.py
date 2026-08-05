import hashlib
import nt
import requests
import os
import sys

# Hasheous API endpoint for SHA-1 lookups
HASHEOUS_API_URL = "https://hasheous.org/api/v1/Lookup/ByHash/"

def calculate_sha1_hashes(file_path: str):
    with open(file_path, "rb") as f:
        data = f.read()

    hashes = {
        "full": hashlib.sha1(data).hexdigest()
    }

    if len(data) >= 16 and data[0:4] == b"NES\x1a":
        print("[+] iNES Header detected")

        stripped = data[16:]
        hashes["headerless"] = hashlib.sha1(stripped).hexdigest()

    return hashes

def query_hasheous(sha1_hash: str) -> dict:
    """
    Queries Hasheous API using the SHA-1 hash to fetch metadata and IGDB mapping.
    """
    payload = {
        "sha1": sha1_hash
    }

    print(f"[+] Querying Hasheous API for SHA-1: {sha1_hash}")
    response = requests.post(HASHEOUS_API_URL, json=payload)

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        print("[-] Game not found in Hasheous database.")
        return None
    else:
        print(f"[-] API Request failed with status code {response.status_code}: {response.text}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python hash_test.py <path_to_nes_file>")
        sys.exit(1)

    nes_path = sys.argv[1]

    if not os.path.exists(nes_path):
        print(f"Error: File '{nes_path}' does not exist.")
        sys.exit(1)

    print(f"Processing: {os.path.basename(nes_path)}")
    
    # 1. Calculate the raw SHA-1 hash
    hashes = calculate_sha1_hashes(nes_path)
    print(f"[+] SHA-1 Hashes: {hashes}\n")

    # 2. Query Hasheous
    result = query_hasheous(hashes["full"])

    # if result is None and "headerless" in hashes:
    #     print("[+] Attempting headerless SHA-1 lookup...")
    #     result = query_hasheous(hashes["headerless"])

    if result:
        print("\n=== MATCH FOUND ===")

        for item in result.get("metadata", []):
            if item.get("objectType") == "Game" and item.get("source") == "IGDB":
                print(int(item["id"]))

if __name__ == "__main__":
    main()