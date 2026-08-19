# Deploying the WebSocket Server to EC2

## 1. Launch an EC2 Instance

1. Go to https://console.aws.amazon.com/ec2
2. Click **Launch Instance**
3. Settings:
   - Name: `openrace-ws`
   - AMI: Amazon Linux 2023 (or Ubuntu 24.04)
   - Instance type: `t3.micro` (free tier) or `t3.small` for production
   - Key pair: create or select one (you need this to SSH in)
   - Security group: allow **TCP 8080** (WebSocket) and **TCP 22** (SSH) from anywhere

4. Click **Launch**

## 2. SSH In

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

## 3. Install Node.js

```bash
# Amazon Linux 2023
sudo yum install -y nodejs npm git

# Or Ubuntu
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt-get install -y nodejs git
```

## 4. Clone and Setup

```bash
git clone https://github.com/rubylongstaff14/driveanywhere.git
cd driveanywhere
npm install
```

## 5. Run the Server

```bash
# Quick test:
npx tsx server/index.ts

# Production (stays running after disconnect):
npm install -g pm2
pm2 start "npx tsx server/index.ts" --name openrace-ws
pm2 save
pm2 startup  # follow the printed command to auto-start on reboot
```

## 6. Set the Client URL

In your Amplify app, add an environment variable:

- Key: `NEXT_PUBLIC_WS_URL`
- Value: `ws://YOUR_EC2_PUBLIC_IP:8080`

Or for production with SSL, put Nginx/Caddy in front with a domain and use `wss://`.

## 7. Test

Open your site, go to Play Online, create a server. Open another browser tab and join.
Both should see each other in the room lobby.
