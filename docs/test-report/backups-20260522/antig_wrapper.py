import sys
import os
import json
import time
import subprocess
import re

session_id = "default-session"
try:
    ppid = os.getppid()
    cmd = f'powershell -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId = {ppid}\\").CommandLine"'
    parent_cmdline = subprocess.check_output(cmd, shell=True).decode('utf-8', errors='ignore').strip()
    
    matches = re.findall(r'(?:"[^"]*"|[^\s"]+)', parent_cmdline)
    if len(matches) >= 5:
        session_id = matches[4].strip('"')
except Exception as e:
    pass

prompt = "No prompt provided"
for i in range(len(sys.argv)):
    if sys.argv[i] == "-p" and i + 1 < len(sys.argv):
        prompt = sys.argv[i+1]
        break

workspace = os.getcwd()
memories_dir = os.path.join(workspace, ".serena", "memories")
os.makedirs(memories_dir, exist_ok=True)

request_path = os.path.join(memories_dir, "docs_request.json")
response_path = os.path.join(memories_dir, "docs_response.json")

request_data = {
    "prompt": prompt,
    "session_id": session_id,
    "workspace": workspace,
    "status": "pending"
}
with open(request_path, "w", encoding="utf-8") as f:
    json.dump(request_data, f, indent=2, ensure_ascii=False)

response_data = None
for _ in range(120):
    if os.path.exists(response_path):
        try:
            with open(response_path, "r", encoding="utf-8") as f:
                response_data = json.load(f)
            break
        except Exception:
            pass
    time.sleep(0.5)

if response_data and "response" in response_data:
    response_text = response_data["response"]
    
    results_dir = os.path.join(workspace, ".agents", "results")
    os.makedirs(results_dir, exist_ok=True)
    
    result_content = f"""# Agent Result (docs)
Status: completed

## Summary of work done
{response_text}

## Files created/modified
- None
"""
    
    file_names = [
        f"result-docs-{session_id}.md",
        "result-docs.md"
    ]
    for fname in file_names:
        fpath = os.path.join(results_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(result_content)
            
    try:
        os.remove(request_path)
        os.remove(response_path)
    except Exception:
        pass
        
    print("Agent execution succeeded.")
    sys.exit(0)
else:
    print("Timeout or failure waiting for response.")
    sys.exit(1)
