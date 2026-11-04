# Warehouse Inventory Management System

A full-stack warehouse inventory management system built with **Node.js, Express.js, MySQL, HTML, CSS, and JavaScript**. The application helps businesses manage products, track stock movements, monitor inventory levels, and manage warehouse employees through a role-based dashboard.

The project started as a backend-focused REST API and was extended into a multi-warehouse inventory management application with analytics, audit tracking, and a separate Super Admin portal.

## Overview

The system provides centralized inventory management with warehouse-level data isolation, role-based access, and stock movement tracking.

### Key Features

- Product management with CRUD operations.
- Stock increase and decrease with validation.
- Automatic low-stock detection.
- Product-wise stock history.
- Multi-warehouse management.
- Warehouse registration and authentication.
- Role-based access control.
- Employee management.
- Audit trail for tracking important activities.
- Dashboard with inventory statistics.
- Inventory analytics and stock health indicators.
- Recent stock activity with filtering.
- Separate Super Admin portal.
- Warehouse activation and deactivation.
- In-page confirmation dialogs and notifications.
- Light and dark themes.

## Tech Stack

| Category | Technologies |
|---|---|
| Backend | Node.js, Express.js |
| Frontend | HTML, CSS, JavaScript |
| Database | MySQL |
| Database Driver | MySQL2 |
| Authentication | JWT |
| API Testing | Postman |
| Automated Testing | Jest, Supertest |
| Version Control | Git, GitHub |

## Application Modules

### 1. Authentication and Warehouse Management

- Warehouse registration with owner account creation.
- Warehouse login using warehouse code and credentials.
- JWT-based authentication.
- Separate authentication for Super Admin.
- Warehouse-level data isolation.
- Account and warehouse status validation.

### 2. Product Management

- Create, view, update, and delete products.
- Unique product codes.
- Product descriptions.
- Configurable low-stock thresholds.
- Input validation.
- Product-specific stock information.

### 3. Inventory Management

- Increase and decrease stock quantities.
- Prevent negative inventory.
- Validate stock availability before deductions.
- Automatic low-stock identification.
- Product-wise stock movement history.
- Track inventory changes with timestamps.

### 4. Dashboard and Analytics

- Total products overview.
- In-stock, low-stock, and out-of-stock statistics.
- Inventory health percentage.
- Stock distribution visualization.
- Recent inventory movements.
- Replenishment attention indicators.

### 5. Employee Management

- Create employee accounts.
- Assign roles to employees.
- Change employee roles based on permissions.
- Activate and deactivate employee accounts.
- Employee search and management.
- Role-based access for administrators and managers.

### 6. Audit Trail

- Track important warehouse activities.
- Record actions performed by users.
- View changes to inventory and employee records.
- Display previous and updated values where available.
- Review activity details with timestamps.

### 7. Recent Activity

- View recent stock movements.
- Search by product name or product code.
- Filter by movement type.
- Filter by employee.
- Filter activities using date ranges.

### 8. Super Admin Portal

- Separate Super Admin login.
- Platform-level dashboard.
- View and manage registered warehouses.
- Create warehouses with owner accounts.
- Activate and deactivate warehouses.
- Delete warehouses.
- Search warehouse records.
- View platform-level audit logs with pagination.

## Project Architecture

The backend follows the MVC pattern to separate responsibilities between routes, controllers, and database operations.

```text
warehouse-management-system/
│
├── controllers/
├── models/
├── routes/
├── middleware/
├── db/
├── tests/
│
├── public/
│   ├── css/
│   ├── js/
│   │   ├── modules/
│   │   └── super-admin/
│   ├── index.html
│   └── super-admin.html
│
├── app.js
├── server.js
├── .env
├── .env.example
└── package.json
```

*Note: Adjust the directory names above to match your actual repository structure.*

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a warehouse |
| POST | `/api/auth/login` | Warehouse login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/super-admin/auth/login` | Super Admin login |
| GET | `/api/super-admin/auth/me` | Get Super Admin details |

### Product Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:id` | Get product details |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/products/low-stock` | Get low-stock products |
| POST | `/api/products/:id/increase` | Increase stock |
| POST | `/api/products/:id/decrease` | Decrease stock |
| GET | `/api/products/:id/history` | Get stock history |

### Dashboard and Activity

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Get dashboard statistics |
| GET | `/api/dashboard/recent-activity` | Get recent stock activity |
| GET | `/api/audit-logs` | Get warehouse audit logs |

### Employee Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Get warehouse users |
| POST | `/api/users` | Create an employee |
| PATCH | `/api/users/:id/role` | Update employee role |
| PATCH | `/api/users/:id/status` | Update employee status |

### Super Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/super-admin/warehouses` | Get all warehouses |
| POST | `/api/super-admin/warehouses` | Create a warehouse |
| PATCH | `/api/super-admin/warehouses/:id/status` | Update warehouse status |
| DELETE | `/api/super-admin/warehouses/:id` | Delete a warehouse |
| GET | `/api/super-admin/audit-logs` | Get platform audit logs |

## Role-Based Access Control

The application uses role-based permissions to control access to warehouse operations.

| Role | Permissions |
|---|---|
| Super Admin | Platform-level warehouse management |
| Owner | Warehouse administration and account management |
| Admin | Product, employee, inventory, and audit management |
| Manager | Inventory and permitted employee management |
| Staff | View inventory and perform permitted stock operations |

Access is enforced through backend authentication and authorization middleware.

## Getting Started

### Prerequisites

- Node.js
- MySQL 8 or higher
- npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/GauravGK30/Warehouse-API.git
cd Warehouse-API
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

Configure your database credentials, server port, JWT secrets, and other environment variables required by your backend.

Never commit your actual `.env` file or secret keys to GitHub.

### 4. Set Up the Database

Create the required MySQL database and execute the database schema provided with the project.

Ensure all required tables, relationships, indexes, and constraints are configured.

### 5. Start the Backend

```bash
npm start
```

For development:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:5000
```

### 6. Open the Frontend

Open `index.html` using Live Server or configure the frontend according to the project's setup.

Use `super-admin.html` to access the separate Super Admin portal.

## Testing

The original API includes automated testing using Jest and Supertest.

Run the test suite using:

```bash
npm test
```

Core inventory test scenarios include:

- Stock increase and decrease.
- Insufficient stock validation.
- Prevention of negative inventory.
- Zero and negative quantity validation.
- Non-existent product handling.
- Low-stock product retrieval.
- Stock history tracking.

## Design Decisions

### MVC Architecture

Separates database operations, business logic, and API routing to improve maintainability.

### MySQL

Provides relational data management, constraints, and transactional support for inventory operations.

### JWT Authentication

Uses token-based authentication to secure warehouse and Super Admin access.

### Warehouse-Level Data Isolation

Warehouse records and operations are scoped to the authenticated warehouse to prevent cross-warehouse data access.

### Stock Validation

Stock quantities must be valid non-negative integers. Dedicated increase and decrease operations validate quantities and available stock before making changes.

### Auditability

Inventory movements and important administrative activities are recorded to support operational tracking and accountability.

## Future Enhancements

- Barcode and QR code scanning.
- Supplier management.
- Purchase order management.
- Excel and CSV import/export.
- Batch and expiry tracking.
- Inter-warehouse stock transfers.
- Automated inventory notifications.

## Author

**Gaurav Kankuse**

GitHub: [GauravGK30](https://github.com/GauravGK30)

Project Repository: [Warehouse-API](https://github.com/GauravGK30/Warehouse-API)

---

If you find this project useful, consider giving the repository a star.
