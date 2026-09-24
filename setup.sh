PIGEON_HOME="${PIGEON_HOME:-/opt/pigeon}"

log() {
  printf '%s %s\n' "$(date -Is)" "$*" >> "${PIGEON_HOME}/setup.log"
}

log "Updating Packages..."
sudo apt update

log "Upgrading Packages..."
sudo apt upgrade -y

log "Upgrade complete"
mkdir -p opt/pigeon/setup

cd opt/pigeon/setup

log "Downloading files..."
wget https://github.com/alexanderszura/OrangePi-Media-Player/releases/latest/download/Pigeon_0.5.1_arm64.deb
log "Downloaded app..."
wget https://github.com/alexanderszura/OrangePi-Media-Player/releases/latest/download/pigeon-launcher-0.5.1.sh
log "Downloading web package..."
wget https://github.com/alexanderszura/OrangePi-Media-Player/releases/latest/download/Pigeon-web-0.5.1.tar.gz

log "Installing RetroPie Packages..."
sudo apt install -y git dialog unzip xmlstarlet

log "Cloning latest repo"
git clone --depth=1 https://github.com/RetroPie/RetroPie-Setup.git

log "Installing RetroPie... "
cd RetroPie-Setup
# sudo ./retropie_setup.sh
# sudo __nodialog=1 ./retropie_packages.sh setup basic_install
sudo ./retropie_packages.sh setup basic_install

log "Install Complete"
cd ../

log "Installing Tauri Build..."
sudo apt install -y ./Pigeon_0.5.1_arm64.deb

log "Installing Web Packages..."
sudo apt install -y nginx

log "Extracting build..."
sudo mkdir -p /var/www/pigeon
sudo tar -xzf ./Pigeon-web-0.5.1.tar.gz -C /var/www/pigeon/

log "Configuring..."
sudo chown -R www-data:www-data /var/www/pigeon
sudo chmod -R 755 /var/www/pigeon

cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80;
    server_name _;

    root /var/www/pigeon;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html; 
    }
}
EOF

sudo systemctl restart nginx

# TODO: Create auto start script, then launch

pigeon

cd ../
# rm -rf opt/pigeon/setup