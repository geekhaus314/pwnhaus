#!/usr/bin/env bash

# 1. Announce execution parameter hooks
echo "[*] Initializing automated headless Go distribution loop..."

# 2. Pull the installer archive safely using fail-fast flags and redirect followers
echo "[*] Querying remote distribution matrices via curl..."
curl -L -f -o go_installer.msi https://go.dev

if [ ! -f go_installer.msi ]; then
    echo "[-] Critical Failure: Curl network stream dropped or target folder structure unreachable."
    exit 1
fi

# 3. Trigger headless Windows setup with strict execution arguments to prevent machine reboots
echo "[*] Launching Windows Installer runtime layer (Silent Mode)..."
msiexec.exe /i go_installer.msi /qn /norestart /l*v go_install.log

# 4. Wait for the background msiexec application process thread loop to finalize
echo "[*] Waiting for deployment system structures to stabilize..."
sleep 8

# 5. Build explicit environment profile path hooks for your Git Bash shell context
echo "[*] Mapping global environmental executable pathways..."
echo 'export PATH=$PATH:"/c/Program Files/Go/bin"' >> ~/.bashrc

# 6. Housekeeping - purge downloaded package installers from storage
echo "[*] Processing filesystem asset optimization routines..."
rm -f go_installer.msi go_install.log

echo "[+] Execution complete! Please run 'source ~/.bashrc' to apply new target paths."
