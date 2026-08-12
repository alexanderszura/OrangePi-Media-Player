import hashlib
import requests
import sys
import os
import json

HASHEOUS_URL = "https://hasheous.org/api/v1/Lookup/ByHash/"


def sha1(data):
    return hashlib.sha1(data).hexdigest()


def hash_rom(path):
    with open(path, "rb") as f:
        data = f.read()

    results = {}

    # Full file
    results["full"] = sha1(data)

    # NES headerless
    if data[:4] == b"NES\x1a":
        print("[+] iNES header detected")

        header = data[:16]

        prg_size = data[4] * 16384
        chr_size = data[5] * 8192

        print(f"[+] PRG size: {prg_size} bytes")
        print(f"[+] CHR size: {chr_size} bytes")

        # Trainer flag
        trainer_size = 512 if (data[6] & 0x04) else 0

        if trainer_size:
            print("[+] Trainer detected (512 bytes)")
        else:
            print("[+] No trainer detected")

        start = 16 + trainer_size
        rom_data = data[start:start + prg_size + chr_size]

        results["headerless"] = sha1(rom_data)

    return results


def query_hasheous(hash_value):
    url = HASHEOUS_URL + hash_value

    print(f"\n[>] Querying Hasheous:")
    print(f"    {hash_value}")

    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "ROMHashTester/1.0",
                "Accept": "application/json"
            },
            timeout=15
        )

        print(f"[<] HTTP {response.status_code}")

        if response.status_code == 200:
            try:
                return response.json()
            except Exception:
                return response.text

        print(f"[-] {response.text}")

    except requests.RequestException as e:
        print(f"[!] Request failed: {e}")

    return None


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python hash_test.py <rom_file>")
        return

    path = sys.argv[1]

    if not os.path.isfile(path):
        print(f"[!] File does not exist: {path}")
        return

    print("=" * 60)
    print("ROM HASH TESTER")
    print("=" * 60)

    print(f"\nFile: {os.path.basename(path)}")
    print(f"Size: {os.path.getsize(path):,} bytes")

    hashes = hash_rom(path)

    print("\n=== HASHES ===")

    for hash_type, value in hashes.items():
        print(f"{hash_type:12}: {value}")

    print("\n=== HASHEOUS LOOKUPS ===")

    for hash_type, hash_value in hashes.items():

        print("\n" + "-" * 60)
        print(f"Testing {hash_type} SHA-1")

        result = query_hasheous(hash_value)

        if result is not None:
            print("\n[+] MATCH FOUND!")
            print(json.dumps(result, indent=4))

            # Stop after first successful match
            break

        else:
            print("[-] No match.")

    print("\n" + "=" * 60)
    print("Finished")
    print("=" * 60)


if __name__ == "__main__":
    main()