# TankLogix: Architectural Defense Manual

This document provides structured answers to advanced technical and security questions that may arise during the interview panel review.

---

## 1. Why On-Premise Execution?
* **Operational Continuity (Resiliency)**: In industrial logistics, a warehouse cannot afford dependencies on external internet connections. If the internet fails, a cloud-only system halts all loading bay operations, resulting in cargo delays and financial penalties. On-premise docker hosting ensures the system runs 100% offline.
* **Bandwidth Optimization**: Real-time camera scans and status updates are processed over local high-speed Wi-Fi, saving internet bandwidth costs.

---

## 2. Why PostgreSQL?
* **ACID Transactions**: Package routing is binary—an item is either fully loaded (`DISPATCHED`) or not. PostgreSQL guarantees transaction safety, preventing partial or corrupted states.
* **Relational Power**: Mappings between physical terminals (bay doors), active docked carriers (trucks), and cargo logs require complex relational joins that PostgreSQL executes in sub-millisecond speeds.

---

## 3. How to Scale Up the Database?
If database operations scale to millions of scans:
* **Read-Write Splitting (Replication)**: We configure PostgreSQL Master-Slave replication. Write operations (live edge scanning updates) hit the Master node. Read-heavy operations (like AI-driven supervisor querying) route to the Slave replica nodes.
* **Database Sharding**: Table partitions partition package manifests by date (e.g., weekly tables) or zone.
* **Connection Pooling**: Use **PgBouncer** as a lightweight connection pooler in front of PostgreSQL to manage thousands of concurrent client connections without exhausting database server resources.

---

## 4. How the AI Access Gateway Works & Why On-Premise?
* **How It Works**: The Node.js proxy acts as a secure middleware layer. It receives natural language intent from the user, retrieves the database schema structure dynamically, feeds both into **Gemma3**, receives the raw SQL, and runs it against PostgreSQL.
* **Why On-Premise**:
  * **Data Privacy**: Sending database layouts, driver names, and logistics logs to third-party cloud APIs (like OpenAI) violates data compliance policies. Keeping Gemma3 local ensures data never leaves the server.
  * **Zero Cost**: Local execution via Ollama consumes zero token API costs, making it completely free to run.

---

## 5. How to Prevent SQL Injection & AI Write Commands?
* **Regex-Based Input Sanitization**: The AI Gateway validates all input parameters and checks the compiled SQL structure via regex rules.
* **Database Role Restrictions (Least Privilege)**: The AI Gateway connects to PostgreSQL using a restricted database user account: `db_readonly`.
  * This user *only* possesses `SELECT` grants on the schema tables.
  * If Gemma3 attempts to run a write or destructive command (e.g. `DROP TABLE`, `UPDATE`, or `DELETE`), the database engine rejects it immediately at the kernel level with `Permission Denied`.

---

## 6. Why Google Gemma3?
* **Structured Data Excellence**: Gemma3 is Google’s state-of-the-art open-source LLM. It is specifically optimized to follow instructions, write code, and compile precise SQL without code backticks or markdown filler.
* **Resource Efficiency**: Its small footprint allows it to run at high speed (token generation speed) on standard local hardware via Ollama.

---

## 7. Securing Database Credentials
* **Dynamic Connection Decryption**: In the Java application, database credentials are loaded directly into RAM and never logged or exposed.
* **Enterprise Protection (Secrets Manager)**: In a production environment, database credentials are not hardcoded. We use configuration encryption engines (like **Jasypt**) and retrieve credentials dynamically from a secure enterprise store such as **HashiCorp Vault** or **AWS Secrets Manager**.
