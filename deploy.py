#!/usr/bin/env python3
import os
import subprocess

with open(os.path.expanduser("~/.centurion/secrets/vercel_token.txt"), "r") as f:
    token = f.read().strip()

os.chdir("/home/maximus/projects/mlt-asset-tracker")
result = subprocess.run(
    ["vercel", "--prod", f"--token={token}"],
    capture_output=True, text=True
)
print("stdout:", result.stdout)
print("stderr:", result.stderr)
print("exit:", result.returncode)
