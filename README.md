# Bank Lite - Simple Banking System

A simple banking application with NestJS backend, React frontend, and MySQL database.

## Features

- User registration and login
- Deposit and withdraw funds
- View account balance
- Persistent data storage with MySQL

## Tech Stack

- **Backend**: NestJS with TypeORM
- **Frontend**: React with Vite
- **Database**: MySQL 8.0
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed

## How to Run

1. Clone or navigate to this directory
2. Run the following command:
   ```bash
   docker-compose up --build
   ```

3. Wait for all services to start (this may take a minute or two)

4. Open your browser to: **http://localhost:5173**

5. Register a new user and start using the banking system!

## Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **MySQL**: localhost:3306

## API Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with username and password
- `POST /account/deposit` - Deposit funds
- `POST /account/withdraw` - Withdraw funds
- `GET /account/:username` - Get account balance

## Database

The MySQL database will persist data in a Docker volume. Even if you restart the containers, your data will be preserved (unless you remove the volume).

To reset the database completely:
```bash
docker-compose down -v
```

## Development

The backend and frontend have hot-reload enabled through volume mounts, so changes to source files will automatically reload.

