# Defense Meeting: Banking Core Systems Cloud Modernization
## Project CloudBank

---

### Slide 1: Title Slide
*   **Project Name:** Project CloudBank
*   **Subtitle:** Validating Core Banking Modernization on AWS
*   **Presenter:** [User's Name]
*   **Context:** Cloud Computing - Semester 07 Defense

---

### Slide 2: Project Objectives
*   **Primary Goal:** Validate a hybrid cloud migration strategy for legacy banking systems.
*   **Technical Objective:** Implement a **NIST-compliant** containerized architecture on AWS.
*   **Strategic Objective:** Achieve operational agility via the NIST Resource Abstraction model.

---

### Slide 3: NIST Cloud Reference Model Mapping (The "Actors")
*   **Cloud Provider:** **AWS** (Physical Resource Layer & IaaS).
*   **Cloud Consumer:** **The Bank** (End-users accessing SaaS).
*   **Cloud Broker:** **Traefik** (Service Intermediation & Aggregation).
*   **Cloud Auditor:** **Audit Prototype (Structured JSON Logging)**.

---

### Slide 4: Cloud Infrastructure Reference Model (Course BLUEPRINT)
*This slide maps our implementation to the model discussed throughout the semester.*

*   **Physical & Virtual Layers (Blue/Green):** AWS EC2 providing raw compute/network pools.
*   **Control Layer (Orange):** **Traefik** as our "Control Software" for traffic regulation.
*   **Orchestration Layer (Yellow):** **Docker Compose** as our "Orchestration Software" for service lifecycle.
*   **Service Layer (Gray):** React Application act as the **"Self-Service Portal"** for banking customers.
*   **Cross-Layer Support:**
    *   **Security (Black):** AWS Security Groups + JWT + TLS.
    *   **Business Continuity (Red):** Volume persistence (Backup) and container healthchecks (Fault Tolerance).

---

### Slide 5: The Control Plane & Resource Abstraction
*   **Resource Abstraction:** **Docker Engine** hiding the physical Linux/AWS hardware details.
*   **Control Plane (The Brain):** 
    *   **Docker Compose:** Service Lifecycle Management.
    *   **Traefik:** Dynamic Traffic Regulation & Protocol Enforcement (TLS 1.3).
    *   **Key Advantage:** Decouples banking logic from infrastructure management.

---

### Slide 6: Essential Characteristics (NIST Validation)
*   **Resource Pooling:** Multi-service orchestration on shared AWS compute.
*   **Rapid Elasticity:** On-demand replica spawning for transaction peaks.
*   **Measured Service:** Billing transparency via AWS CloudWatch metrics.
*   **Broad Network Access:** Standard HTTPS/TLS access validated globally.

---

### Slide 7: The Shared Responsibility Model
*   **AWS Responsibility (Security OF the Cloud):** Physical data centers, virtualization stack, and Nitro hypervisor.
*   **Our Responsibility (Security IN the Cloud):** 
    *   **OS Layer:** Patching Ubuntu on EC2.
    *   **Network:** Configuring AWS Security Groups (Firewall).
    *   **Application:** JWT Auth & Traefik SSL termination.

---

### Slide 8: Deployment Methodology (The "How")
*   **Network Segmentation:** Orchestrated multi-tier network (Internal vs External).
*   **Service Discovery:** Traefik's dynamic auto-discovery of AWS-hosted containers.
*   **Zero-Downtime:** Configuration updates applied in real-time without service restarts.

---

### Slide 9: Live Validation & Results
*   **Infrastructure:** AWS EC2 t3.medium with Elastic IP.
*   **Performance:** <120ms average API response time.
*   **Security:** A+ SSL rating with automated certificate renewal.
*   **FinOps:** ~90% cost reduction compared to legacy on-prem hardware maintenance.

---

### Slide 10: Conclusion & Future Roadmap
*   **Outcome:** Proved that core banking can move to the cloud securely using NIST frameworks.
*   **Future:** Migration from local MySQL to **Managed AWS RDS (PaaS)**.
*   **Final Word:** Infrastructure is now Code, and Compliance is now Automated.
*   **Q&A Session**

---
---

# 🗣️ Defense Speaker Script (Architecture Commentary)

#### **Slide 3: The Actors**
> "Professors, we modelled our stakeholders according to NIST. **AWS** is our Provider, giving us the raw iron. **Traefik** is our **Cloud Broker**. This is key—it mediates between the external world and our internal microservices, handling the complexity of routing and security so the application logic remains clean."

#### **Slide 4: Course Infrastructure Model**
> "Professors, this diagram should look familiar. We used the **Cloud Infrastructure Reference Model** discussed in class as our implementation blueprint. We provisioned our **Virtual Layer** on AWS, but optimized it with Docker for 'Resource Pooling.' We didn't just run apps; we used **Docker Compose** as our 'Orchestration Software' and **Traefik** as our 'Control Software' to manage the orange and yellow layers you've been explaining all semester. This ensures that the **Service Layer** (our bank portal) acts as the 'Self-Service Portal' for modern banking."

#### **Slide 5: Control Plane**
> "This is the core of our modernization. In a legacy bank, the app and the server are tightly coupled. In our model, we introduced **Resource Abstraction** via Docker. But more importantly, we built a **Control Plane** using Traefik and Docker Compose. This 'Brain' automatically detects when we scale up new transaction nodes and routes traffic instantly. We don't configure static IP addresses; the Control Plane handles it dynamically."

#### **Slide 7: Shared Responsibility**
> "Security is not solely AWS's job. We operated under the Shared Responsibility Model. While AWS protects the physical data center, we took ownership of **Security IN the cloud**. We hardened the Ubuntu OS, configured VPC firewalls via Security Groups, and implemented JWT authentication at the application level. It's a defense-in-depth approach."

---

# ❓ Anticipated Q&A Prep

**Q1: Why use Traefik instead of AWS's own Load Balancer (ALB)?**
*   **Answer:** "Portability and Cloud Agnosticism. AWS ALB locks us into their ecosystem. Traefik allows this architecture to be 'Multi-Cloud.' We could move this to Azure or On-Premise tomorrow with zero code changes, which is a core NIST cloud goal."

**Q2: How does this satisfy the Cloud Auditor role?**
*   **Answer:** "We implemented structured JSON logging within the application. This ensures that every transaction generates an immutable, machine-readable audit trail that can be evaluated by external regulatory actors without needing access to the core database."

**Q3: Is the database exposed to the internet?**
*   **Answer:** "No. Using Docker's internal networking, the MySQL instance is in a private segment. Only the Backend container can reach it. External users only see port 443 on Traefik, significantly reducing the attack surface."
