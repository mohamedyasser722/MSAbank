# Project CloudBank: Running the Prototype

This prototype simulates a modernized banking core with account management, loan processing, and secure audit logging.

## Prerequisites
- Docker & Docker Compose
- Node.js (Optional, for local development)

## How to Run (Docker)

1.  **Clone/Open the project directory.**
2.  **Ensure you have a Traefik proxy network** (the current `docker-compose.yml` expects one) OR modify the `docker-compose.yml` to use simple port mapping.
    
    *Simple Port Mapping Alternative:*
    If you don't have Traefik, you can modify the `backend` and `frontend` services in `docker-compose.yml` to include:
    ```yaml
    # backend
    ports:
      - "3000:3000"
    # frontend
    ports:
      - "5173:5173"
    ```

3.  **Start the services:**
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    - Local Frontend: `http://localhost:5173`
    - Local API: `http://localhost:3000`

## Prototype Features
- **Account Management:** Register with a $1,000 welcome bonus.
- **Transactions:** Real-time deposit and withdrawal.
- **Loan Processing:** Automated loan approval based on current balance (Max 5x balance).
- **Audit Trail:** Secure, immutable logging of every action, visible in the dashboard.

## Cloud Modernization Report
The detailed business and technical report is available in:
`CORE_BANKING_CLOUD_REPORT.md`

## Presentation Slides
The outline for your defense presentation is available in:
`PRESENTATION_OUTLINE.md`
