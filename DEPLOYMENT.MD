# 🚀 Docker + Traefik Deployment Masterclass

> **Using MSAbank as a Real-World Case Study**

This guide will take you from zero to hero in understanding modern containerized deployments with automatic HTTPS. By the end, you'll understand exactly how your MSAbank application works and how to deploy any application like a pro.

---

## 📚 Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Understanding Docker & Docker Compose](#2-understanding-docker--docker-compose)
3. [Understanding Traefik - The Reverse Proxy](#3-understanding-traefik---the-reverse-proxy)
4. [How SSL/TLS Certificates Work with Let's Encrypt](#4-how-ssltls-certificates-work-with-lets-encrypt)
5. [Docker Networking - The Hidden Complexity](#5-docker-networking---the-hidden-complexity)
6. [Your MSAbank Architecture Explained](#6-your-msabank-architecture-explained)
7. [The Bug We Fixed - Network Misconfiguration](#7-the-bug-we-fixed---network-misconfiguration)
8. [Complete Request Flow - From Browser to Database](#8-complete-request-flow---from-browser-to-database)
9. [Best Practices & Tips](#9-best-practices--tips)

---

## 1. The Big Picture

### What Are We Trying to Achieve?

When you deploy a web application, you need:

```
🌐 User's Browser
        ↓
   [HTTPS Request to app-bank.mashaheir.com]
        ↓
🔒 SSL/TLS Termination (decrypt HTTPS → HTTP)
        ↓
🔀 Routing (which service handles this request?)
        ↓
🖥️ Your Application (frontend/backend)
        ↓
💾 Database
```

### The Traditional (Painful) Way

In the old days, you'd need:
- **Nginx** installed on your server (manually configured)
- **Certbot** to get SSL certificates (run manually every 90 days)
- **PM2** or similar to keep your Node.js apps running
- **MySQL** installed directly on the server
- Firewall rules, port forwarding, and tons of configuration files

### The Modern (Docker + Traefik) Way

With our setup:
- **Everything runs in containers** (isolated, reproducible, portable)
- **Traefik automatically detects** new services
- **SSL certificates are obtained and renewed automatically**
- **Zero-downtime deployments** are easy
- **Configuration is code** (version controlled, reviewable)

---

## 2. Understanding Docker & Docker Compose

### What is Docker?

Docker packages your application with all its dependencies into a **container** - a lightweight, isolated environment that runs the same everywhere.

```
┌─────────────────────────────────────┐
│          Your Host Machine          │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ Frontend│ │ Backend │ │ MySQL │ │
│  │Container│ │Container│ │ Cont. │ │
│  └─────────┘ └─────────┘ └───────┘ │
│                                     │
│  Each container has its own:        │
│  - File system                      │
│  - Network interface                │
│  - Process space                    │
└─────────────────────────────────────┘
```

### What is Docker Compose?

Docker Compose lets you define **multi-container applications** in a single YAML file. Instead of running multiple `docker run` commands, you just run:

```bash
docker compose up -d
```

### Your MSAbank docker-compose.yml Explained

Let's break down your file section by section:

```yaml
version: '3.8'  # Docker Compose file format version (now obsolete, can be removed)

services:       # List of containers to run
```

#### The MySQL Service

```yaml
mysql:
  image: mysql:8.0                          # Official MySQL 8.0 image from Docker Hub
  container_name: bank-mysql                # Custom name for easy identification
  environment:                              # Environment variables passed to container
    MYSQL_ROOT_PASSWORD: rootpassword       # MySQL root password
    MYSQL_DATABASE: bankdb                  # Create this database on startup
  volumes:
    - mysql_data:/var/lib/mysql             # Persist data outside container
  networks:
    - default                               # Use the default network for this compose file
  healthcheck:                              # Check if MySQL is ready
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**Key Concepts:**
- **`image`**: Pulls from Docker Hub (like npm for containers)
- **`volumes`**: Without this, data is lost when container restarts!
- **`healthcheck`**: Other services can wait until MySQL is "healthy"

#### The Backend Service

```yaml
backend:
  build: ./backend                          # Build from Dockerfile in ./backend
  container_name: bank-backend
  networks:
    - traefik-proxy                         # Connect to Traefik's network
    - default                               # Also connect to MySQL's network
  volumes:
    - ./backend/src:/app/src                # Live reload - changes sync to container
  environment:
    - DB_HOST=mysql                         # Use container name as hostname!
    - DB_PORT=3306
    - DB_USERNAME=root
    - DB_PASSWORD=rootpassword
    - DB_DATABASE=bankdb
  depends_on:
    mysql:
      condition: service_healthy            # Wait for MySQL healthcheck to pass
  restart: on-failure                       # Restart if it crashes
  labels:                                   # Traefik reads these labels!
    - "traefik.enable=true"
    - "traefik.docker.network=traefik-proxy"
    - "traefik.http.routers.msabank-backend.rule=Host(`api-bank.mashaheir.com`)"
    - "traefik.http.routers.msabank-backend.entrypoints=websecure"
    - "traefik.http.routers.msabank-backend.tls.certresolver=myresolver"
    - "traefik.http.services.msabank-backend.loadbalancer.server.port=3000"
```

**Key Concepts:**
- **`build`**: Builds a custom image from your Dockerfile
- **`DB_HOST=mysql`**: Container names become hostnames on shared networks!
- **`labels`**: This is how Traefik knows about your service (more on this later)

#### The Frontend Service

```yaml
frontend:
  build: ./frontend
  container_name: bank-frontend
  networks:
    - traefik-proxy                         # Only needs Traefik's network
  volumes:
    - ./frontend/src:/app/src               # Live reload
  environment:
    - CHOKIDAR_USEPOLLING=true              # Needed for file watching in Docker
    - VITE_API_URL=https://api-bank.mashaheir.com
  depends_on:
    - backend                               # Start after backend
  labels:                                   # Traefik configuration
    - "traefik.enable=true"
    - "traefik.docker.network=traefik-proxy"
    - "traefik.http.routers.msabank-frontend.rule=Host(`app-bank.mashaheir.com`)"
    - "traefik.http.routers.msabank-frontend.entrypoints=websecure"
    - "traefik.http.routers.msabank-frontend.tls.certresolver=myresolver"
    - "traefik.http.services.msabank-frontend.loadbalancer.server.port=5173"
```

#### Networks Declaration

```yaml
networks:
  traefik-proxy:
    external: true      # This network already exists (created by Traefik's compose file)
  # 'default' is implicitly created as 'msabank_default'

volumes:
  mysql_data:           # Declares a named volume for persistence
```

---

## 3. Understanding Traefik - The Reverse Proxy

### What is a Reverse Proxy?

A reverse proxy sits in front of your applications and handles:
- **SSL termination** (encrypting/decrypting HTTPS)
- **Routing** (directing requests to the right service)
- **Load balancing** (distributing traffic across multiple instances)

```
                    INTERNET
                        │
                        ▼
              ┌─────────────────┐
              │     Traefik     │  ← Receives ALL incoming traffic
              │ (Reverse Proxy) │  ← Handles SSL certificates
              └─────────────────┘
                   │         │
          ┌────────┘         └────────┐
          ▼                           ▼
   ┌─────────────┐             ┌─────────────┐
   │  Frontend   │             │  Backend    │
   │ :5173       │             │ :3000       │
   └─────────────┘             └─────────────┘
```

### Why Traefik Over Nginx?

| Feature | Nginx | Traefik |
|---------|-------|---------|
| Configuration | Static files | Dynamic (auto-discovers services) |
| SSL Certificates | Manual + Certbot | Automatic via Let's Encrypt |
| Docker Support | Requires manual config | Native integration |
| Hot Reload | Requires reload command | Real-time updates |

### Your Traefik docker-compose.yml Explained

```yaml
services:
  traefik:
    image: traefik:v3.6
    container_name: traefik
    command:
      # API & Dashboard
      - "--api.insecure=true"               # Enable dashboard (port 8080)
      
      # Docker Provider
      - "--providers.docker=true"           # Watch Docker for new containers
      - "--providers.docker.exposedbydefault=false"  # Don't expose containers unless they opt-in
      
      # Entrypoints (ports Traefik listens on)
      - "--entrypoints.web.address=:80"              # HTTP
      - "--entrypoints.websecure.address=:443"       # HTTPS
      
      # Let's Encrypt Configuration
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=your@email.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    
    ports:
      - "80:80"         # HTTP - needed for ACME challenges
      - "443:443"       # HTTPS - main traffic
      - "8080:8080"     # Dashboard
    
    volumes:
      - "./letsencrypt:/letsencrypt"                    # Persist certificates
      - "/var/run/docker.sock:/var/run/docker.sock:ro" # Watch Docker events
    
    networks:
      - traefik-proxy   # All services connect to this network

networks:
  traefik-proxy:
    name: traefik-proxy   # Explicitly named so other compose files can use it
    driver: bridge
```

### Understanding Traefik Labels

Labels are metadata attached to containers. Traefik reads these to configure itself dynamically:

```yaml
labels:
  # Enable Traefik for this container
  - "traefik.enable=true"
  
  # Which Docker network to use for routing
  - "traefik.docker.network=traefik-proxy"
  
  # Router configuration (how to route requests)
  - "traefik.http.routers.msabank-backend.rule=Host(`api-bank.mashaheir.com`)"
  - "traefik.http.routers.msabank-backend.entrypoints=websecure"
  - "traefik.http.routers.msabank-backend.tls.certresolver=myresolver"
  
  # Service configuration (where to send requests)
  - "traefik.http.services.msabank-backend.loadbalancer.server.port=3000"
```

**Breaking down the label names:**

```
traefik.http.routers.msabank-backend.rule
│       │      │         │           │
│       │      │         │           └─ Property name
│       │      │         └─ Router name (unique identifier)
│       │      └─ Object type (routers, services, middlewares)
│        └─ Protocol (http, tcp, udp)
└─ Traefik namespace
```

### How Traefik Auto-Discovery Works

```
1. Traefik connects to Docker socket (/var/run/docker.sock)
                    │
2. Docker notifies Traefik when containers start/stop
                    │
3. Traefik reads labels from new containers
                    │
4. Traefik updates its routing table automatically
                    │
5. No restart needed! Traffic is routed immediately
```

---

## 4. How SSL/TLS Certificates Work with Let's Encrypt

### What is SSL/TLS?

SSL (Secure Sockets Layer) / TLS (Transport Layer Security) encrypts traffic between the browser and server, preventing:
- **Eavesdropping** (reading your data)
- **Man-in-the-middle attacks** (impersonating the server)
- **Data tampering** (modifying data in transit)

```
Without HTTPS:              With HTTPS:
┌────────┐                  ┌────────┐
│Browser │                  │Browser │
└───┬────┘                  └───┬────┘
    │ "password123"             │ 🔒 encrypted blob
    ▼                           ▼
┌──────────┐                ┌──────────┐
│  Hacker  │ ← Can read!    │  Hacker  │ ← Can't read!
└──────────┘                └──────────┘
    │                           │
    ▼                           ▼
┌────────┐                  ┌────────┐
│ Server │                  │ Server │
└────────┘                  └────────┘
```

### What is Let's Encrypt?

Let's Encrypt is a free Certificate Authority (CA) that issues SSL certificates. Before Let's Encrypt (2015), certificates cost $50-$200/year!

### The ACME Protocol (HTTP Challenge)

ACME (Automatic Certificate Management Environment) is how Traefik talks to Let's Encrypt:

```
Step 1: Traefik → Let's Encrypt
        "I want a certificate for api-bank.mashaheir.com"

Step 2: Let's Encrypt → Traefik
        "Prove you control that domain by placing this token 
         at http://api-bank.mashaheir.com/.well-known/acme-challenge/xyz123"

Step 3: Traefik automatically creates that route

Step 4: Let's Encrypt → http://api-bank.mashaheir.com/.well-known/acme-challenge/xyz123
        (Fetches the token)

Step 5: Let's Encrypt → Traefik
        "Verified! Here's your certificate (valid for 90 days)"

Step 6: Traefik stores certificate in /letsencrypt/acme.json

Step 7: Traefik automatically renews before expiration (at ~30 days remaining)
```

### Your Certificate Configuration

```yaml
command:
  # Use HTTP challenge (most common)
  - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
  
  # Use port 80 for the challenge
  - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
  
  # Email for expiration notices
  - "--certificatesresolvers.myresolver.acme.email=chopyasser722@gmail.com"
  
  # Where to store certificates
  - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
```

**Important:** The `myresolver` name is referenced in your service labels:
```yaml
- "traefik.http.routers.msabank-backend.tls.certresolver=myresolver"
```

---

## 5. Docker Networking - The Hidden Complexity

This is where **your bug** was! Docker networking is often misunderstood.

### Types of Docker Networks

```
1. BRIDGE (default)
   - Containers on same network can communicate
   - Isolated from other networks
   - Most common type

2. HOST
   - Container shares host's network
   - No isolation, container uses host's IP

3. OVERLAY
   - For multi-host networking (Docker Swarm)
   - Spans across multiple servers

4. NONE
   - No networking at all
```

### How Container Communication Works

Containers on the **same network** can reach each other using **container names** as hostnames:

```
┌─────────────────────────────────────────┐
│         traefik-proxy network           │
│  ┌─────────────┐     ┌─────────────┐   │
│  │   traefik   │────▶│  frontend   │   │
│  │  172.18.0.2 │     │  172.18.0.4 │   │
│  └─────────────┘     └─────────────┘   │
│         │                               │
│         │            ┌─────────────┐   │
│         └───────────▶│   backend   │   │
│                      │  172.18.0.3 │   │
│                      └─────────────┘   │
└─────────────────────────────────────────┘

All containers can reach each other by name:
- traefik can reach "backend" or "frontend"
- backend can reach "traefik"
```

### Multi-Network Containers

Your backend is special - it needs to be on TWO networks:

```
┌─────────────────────────────────────────┐
│         traefik-proxy network           │
│  ┌─────────────┐     ┌─────────────┐   │
│  │   traefik   │────▶│   backend   │   │
│  │  172.18.0.2 │     │  172.18.0.3 │   │
│  └─────────────┘     └─────────────┘   │
└─────────────────────────────────────────┘
                              │
                              │ (same container, different IP)
                              │
┌─────────────────────────────────────────┐
│         msabank_default network         │
│  ┌─────────────┐     ┌─────────────┐   │
│  │   backend   │────▶│    mysql    │   │
│  │  172.19.0.3 │     │  172.19.0.2 │   │
│  └─────────────┘     └─────────────┘   │
└─────────────────────────────────────────┘
```

**The backend has TWO IP addresses:**
- `172.18.0.3` on `traefik-proxy` (for Traefik)
- `172.19.0.3` on `msabank_default` (for MySQL)

---

## 6. Your MSAbank Architecture Explained

### Complete System Architecture

```
                         INTERNET
                             │
                  ┌──────────┴──────────┐
                  │    DNS Resolution   │
                  │                     │
                  │ app-bank.mashaheir.com → 3.213.226.169
                  │ api-bank.mashaheir.com → 3.213.226.169
                  └──────────┬──────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │       Your EC2 Server       │
              │        3.213.226.169        │
              │                             │
              │  ┌───────────────────────┐  │
              │  │        Traefik        │  │
              │  │  Listening :80, :443  │  │
              │  └───────────────────────┘  │
              │          │           │      │
              │          ▼           ▼      │
              │  ┌──────────┐ ┌──────────┐  │
              │  │ Frontend │ │ Backend  │  │
              │  │  :5173   │ │  :3000   │  │
              │  └──────────┘ └──────────┘  │
              │                     │       │
              │                     ▼       │
              │               ┌──────────┐  │
              │               │  MySQL   │  │
              │               │  :3306   │  │
              │               └──────────┘  │
              └─────────────────────────────┘
```

### Request Flow Diagram

```
1. User visits https://app-bank.mashaheir.com

2. DNS resolves to 3.213.226.169

3. Browser connects to :443 (HTTPS)
   └─▶ Traefik receives connection

4. Traefik checks TLS certificate
   └─▶ Uses certificate from /letsencrypt/acme.json

5. Traefik decrypts HTTPS → HTTP

6. Traefik checks Host header: "app-bank.mashaheir.com"
   └─▶ Matches router rule: Host(`app-bank.mashaheir.com`)

7. Traefik forwards to frontend service
   └─▶ http://172.18.0.4:5173

8. Frontend responds with HTML/JS

9. Traefik encrypts response → HTTPS

10. User sees the bank login page!
```

### API Request Flow

```
1. Frontend JavaScript calls: fetch('https://api-bank.mashaheir.com/auth/register')

2. Browser → Traefik :443

3. Traefik matches: Host(`api-bank.mashaheir.com`)

4. Traefik forwards to: http://172.18.0.3:3000

5. Backend processes request
   └─▶ Connects to mysql:3306 (resolves to 172.19.0.2)

6. MySQL returns data

7. Backend → Traefik → Browser

8. Frontend updates UI
```

---

## 7. The Bug We Fixed - Network Misconfiguration

### What Was Happening?

When you tried to register, you saw "fetch failed" and no network requests appeared. Here's why:

```
                    THE PROBLEM
                    
    Traefik was on: traefik-proxy network (172.18.x.x)
    
    Backend was on:
    ├── traefik-proxy (172.18.0.3)  ← Correct IP
    └── msabank_default (172.19.0.3)  ← Wrong IP
    
    Traefik picked 172.19.0.3 (wrong network!)
    
    Traefik tried: http://172.19.0.3:3000
                        │
                        ▼
                   ❌ UNREACHABLE!
                   
    (Traefik is not on the 172.19.x.x network)
```

### The Traefik API Showed the Problem

**Before fix:**
```json
{
  "name": "backend@docker",
  "loadBalancer": {
    "servers": [
      {
        "url": "http://172.19.0.3:3000"  ← WRONG NETWORK!
      }
    ]
  }
}
```

**After fix:**
```json
{
  "name": "msabank-backend@docker",
  "loadBalancer": {
    "servers": [
      {
        "url": "http://172.18.0.3:3000"  ← CORRECT NETWORK!
      }
    ]
  }
}
```

### The Solution

We added this label to tell Traefik which network to use:

```yaml
labels:
  - "traefik.docker.network=traefik-proxy"  ← THIS WAS THE FIX!
```

This explicitly tells Traefik: "When connecting to this container, use the IP address from the `traefik-proxy` network, not any other network."

### Why Did This Happen?

When a container is on multiple networks, Docker doesn't guarantee which IP Traefik will discover first. The behavior can change on restart! That's why you should **always** specify `traefik.docker.network` when:
- Your container is on multiple networks
- You want predictable behavior

---

## 8. Complete Request Flow - From Browser to Database

Let's trace a complete registration request:

### Step-by-Step Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Clicks "Register" Button                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Frontend JavaScript (App.jsx line 19):                           │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ await fetch(`${API_URL}/auth/register`, {                   │  │
│   │     method: 'POST',                                          │  │
│   │     headers: { 'Content-Type': 'application/json' },        │  │
│   │     body: JSON.stringify({ username: 'test', password: 'x'}) │ │
│   │ });                                                          │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   API_URL = 'https://api-bank.mashaheir.com'                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Browser DNS Resolution                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Browser: "What's the IP for api-bank.mashaheir.com?"             │
│   DNS:     "It's 3.213.226.169"                                    │
│                                                                     │
│   (Your DNS records point both domains to the same server)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: TLS Handshake                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Browser → Server:443: "Hello, I want to connect securely"        │
│   Server → Browser: "Here's my certificate for api-bank.mashaheir" │
│   Browser: "Certificate is valid and trusted ✓"                    │
│   Both: "OK, all future traffic is encrypted with AES-128-GCM"     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: Traefik Receives Request                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Traefik decrypts the HTTPS request:                              │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ POST /auth/register HTTP/2                                   │  │
│   │ Host: api-bank.mashaheir.com                                │  │
│   │ Content-Type: application/json                               │  │
│   │                                                              │  │
│   │ {"username":"test","password":"x"}                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   Traefik checks its routing rules...                              │
│   Found: msabank-backend@docker matches Host(`api-bank...`)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: Traefik Forwards to Backend                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Traefik → http://172.18.0.3:3000/auth/register                   │
│                                                                     │
│   Note: This is internal Docker network traffic (unencrypted)      │
│   It's safe because it never leaves the server!                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: NestJS Backend Processes Request                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   main.ts - AppController:                                          │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ @Post('auth/register')                                       │  │
│   │ register(@Body() body: AuthDto) {                            │  │
│   │   return this.appService.register(body);                     │  │
│   │ }                                                            │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   AppService.register():                                            │
│   1. Check if user exists in database                              │
│   2. Hash password (you should add this!)                          │
│   3. Create new user                                               │
│   4. Save to MySQL                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: Backend Connects to MySQL                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TypeORM connection config:                                        │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ host: 'mysql'  // Resolves to 172.19.0.2 on msabank_default  │ │
│   │ port: 3306                                                   │  │
│   │ database: 'bankdb'                                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   SQL executed:                                                     │
│   INSERT INTO users (username, password, balance)                  │
│   VALUES ('test', 'x', 0)                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 8: Response Travels Back                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   MySQL → Backend:                                                  │
│     { affectedRows: 1, insertId: 1 }                               │
│                                                                     │
│   Backend → Traefik:                                                │
│     HTTP 201 Created                                                │
│     { message: "User registered", user: { username: "test" } }     │
│                                                                     │
│   Traefik → Browser:                                                │
│     (Encrypts response with TLS)                                   │
│     HTTPS 201 Created                                               │
│                                                                     │
│   Browser → Frontend JavaScript:                                    │
│     const data = await res.json();                                 │
│     setSuccess('Registration successful!');                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Best Practices & Tips

### 🔐 Security

```yaml
# 1. Never expose database ports to the internet
mysql:
  # ports:  ← DON'T DO THIS
  #   - "3306:3306"
  # Only internal Docker network access

# 2. Use secrets for sensitive data (not environment variables in production)
environment:
  - DB_PASSWORD=${DB_PASSWORD}  # At minimum, use .env files

# 3. Always use HTTPS
labels:
  - "traefik.http.routers.myapp.entrypoints=websecure"  # Not 'web'!

# 4. Add rate limiting
labels:
  - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"
```

### 🔄 Reliability

```yaml
# 1. Always use healthchecks
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# 2. Use restart policies
restart: unless-stopped  # Survives server reboots

# 3. Specify resource limits
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
```

### 📊 Monitoring

```bash
# Check Traefik dashboard
http://your-server:8080

# Check all routes
curl http://localhost:8080/api/http/routers | jq

# Check all services
curl http://localhost:8080/api/http/services | jq

# Check if service is reachable
docker exec traefik wget -qO- http://backend:3000/
```

### 🐛 Debugging Tips

```bash
# 1. Check container logs
docker logs bank-backend -f

# 2. Check if containers are running
docker ps

# 3. Check container networks
docker inspect bank-backend --format '{{json .NetworkSettings.Networks}}' | jq

# 4. Test internal connectivity
docker exec bank-backend ping mysql
docker exec traefik wget -qO- http://bank-backend:3000/

# 5. Check Traefik picked the right IP
curl http://localhost:8080/api/http/services | jq '.[] | select(.name | contains("backend"))'
```

### 🚀 Deployment Checklist

- [ ] DNS records pointing to your server
- [ ] Port 80 and 443 open in firewall/security group
- [ ] Traefik running before other services
- [ ] `traefik.docker.network` label set for multi-network containers
- [ ] Unique router names across all services
- [ ] Volumes configured for persistent data
- [ ] Health checks defined
- [ ] CORS configured in backend
- [ ] SSL certificate issued (check Traefik logs)

---

## 🎓 Summary

You now understand:

1. **Docker Compose** orchestrates multiple containers as one application
2. **Traefik** automatically discovers services and routes traffic
3. **Let's Encrypt + ACME** provides free, automatic SSL certificates
4. **Docker Networks** isolate and connect containers
5. **Labels** configure Traefik without modifying its config files
6. **The bug** was Traefik using the wrong network IP

Your MSAbank deployment is now:
- ✅ Containerized and portable
- ✅ HTTPS secured with auto-renewing certificates
- ✅ Properly networked between services
- ✅ Easy to update and redeploy

---

*Created for MSAbank deployment - December 2025*
