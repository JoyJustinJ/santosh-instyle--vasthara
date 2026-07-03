# Product Requirements Document (PRD) - Vasthara CRM

## 1. Product Overview
Vasthara is a comprehensive Customer Relationship Management (CRM) and Scheme Management Progressive Web Application (PWA) built for Santosh Instyle. It digitizes the management of customer investment schemes, monthly installment tracking, staff referral incentives, and administrative oversight. The system provides role-based access for Customers, Staff, and Administrators to securely manage financial records and rewards.

## 2. Target Audience & Roles
*   **Customer:** End-users who subscribe to investment/savings schemes (e.g., 500 Rs Scheme, 1000 Rs Scheme). They can view their payment history, download receipts, and process scheme fulfillments.
*   **Standard Field Staff:** Employees who enroll new customers and collect monthly installments. They receive referral incentives for new enrollments.
*   **Super Staff / Branch Manager:** Elevated staff roles that can manage other staff members, approve overrides, and view branch-level analytics.
*   **Admin (Main Admin):** The system owner who has full access to the database, can configure scheme rules, manage all staff authorities, track system-wide analytics, and process bulk data exports/imports.

## 3. Key Features & Requirements

### 3.1 Authentication & Security
*   **Phone Number + OTP Login:** Secure, passwordless login using Indian phone numbers (+91) and SMS-based OTP verification.
*   **Role-Based Access Control (RBAC):** UI and backend access restricted based on the user's role (Admin, Manager, Staff, Customer).
*   **Biometric Authentication:** Support for native mobile biometric unlock (via Capacitor plugins) for quick access.

### 3.2 Scheme Management
*   **Dynamic Scheme Creation:** Admins can define new investment plans (amount, duration, bonus incentives).
*   **Subscription Tracking:** Track which customers are enrolled in which schemes, counting the number of paid months.
*   **Installment Collection:** Staff and Admins can log monthly payments against a customer's account.
*   **Scheme Fulfillment:** Once a scheme reaches maturity (e.g., 11 months paid), the customer can redeem it. This requires OTP verification from the customer's registered phone to prevent fraud.

### 3.3 Financial Reporting & PDF Generation
*   **Automated Receipts:** Generates downloadable A4-sized PDF receipts for every transaction (deposit, fulfillment).
*   **Smart Page-Breaking:** PDF generation must intelligently calculate whitespace to ensure transaction rows are not cut in half across pages.
*   **Customer Reports:** Comprehensive statements showing all historical installments and redemptions for a single customer.

### 3.4 Staff Management & Incentives
*   **Referral Tracking:** Every customer enrollment is tagged with the enrolling staff's Employee ID.
*   **Incentive Calculation:** Staff dashboards display earned commissions based on active customer deposits.
*   **Staff Authority Management:** Admins can promote/demote staff access levels (Standard -> Super -> Manager) and generate Staff Reports via CSV export.

### 3.5 Database & Operations (Admin Only)
*   **CSV Data Import/Export:** Admins can bulk import legacy customer data and export transaction logs for auditing.
*   **Audit Logging:** Critical actions (like deleting a transaction or modifying user data) must be logged with the timestamp and acting Admin's ID.

## 4. Technical Stack
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion.
*   **Mobile Wrapper:** Capacitor (Android APK generation).
*   **Backend/Database:** Firebase (Firestore, Authentication).
*   **SMS Gateway:** Custom proxy server for Pay4SMS integration.
*   **PDF Generation:** html2canvas-pro + jsPDF.

## 5. Success Metrics
*   0% data loss during offline/online synchronization.
*   PDF receipts format correctly on A4 paper 100% of the time.
*   OTP delivery and verification complete within 10 seconds.
*   Elimination of manual entry errors in referral tracking.
