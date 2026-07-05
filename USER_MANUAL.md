# Vastra 3.0 - Official User Manual
**A Complete Guide for Administrators, Managers, and Staff**

Welcome to the Vastra Loyalty & Savings platform. This manual provides a highly detailed, step-by-step overview of how to manage the system, handle customers, process transactions, and track analytics based on your specific organizational role.

---

## 1. Understanding System Access and Roles

The Vastra system operates on a strict, tiered access model to ensure data security, privacy, and operational efficiency across all branches. 

| Role | Access Level | Key Responsibilities |
| :--- | :--- | :--- |
| **Primary Admin** | Full System Access | Define financial programs, manage all staff hierarchy, execute system resets, monitor global audit logs, and oversee all analytics. |
| **Branch Manager** | Elevated Staff Access | Oversee branch operations, process transactions, generate detailed customer PDF reports, update customer phone numbers, and track defaulters. |
| **Super Staff** | Elevated Staff Access | Process customer transactions, issue credit notes, and approve pending standard staff registration requests. |
| **Staff** | Standard Access | Enroll new customers, process daily payments, track personal referral incentives, and manage individual customer portfolios. |

---

## 2. Primary Admin Guide

The Primary Admin account is the highest level of authority in the system. It handles foundational system setup and sweeping operational controls.

### Program Management
1. **Create Program:** Navigate to the 'Create Program' module. You must define the Program Name, the fixed Monthly Installment Amount, the Duration (in months), and the Final Maturity Value. Once saved, the program is instantly live and available for customers to join.
2. **Manage Programs:** Use the 'Manage Programs' tab to edit details of existing programs. Note that active customers on a program will continue under the rules they agreed to upon joining. Programs can be marked inactive to prevent new sign-ups.

### Managing System Hierarchy (Staff Rights)
- **Promotions:** The Primary Admin is the only role that can promote a standard Staff member to a Super Staff member or a Branch Manager. 
- Navigate to the 'Staff Rights' view, search for the registered staff member, and use the dropdown to elevate or demote their access tier.

### Global Communications (Broadcasts)
- Navigate to the 'Send Broadcast' section.
- Input a clear title and message. You can choose to push this message to "All Customers" or select a custom group of users.
- **Delivery:** When a customer next opens their Vastra app, the broadcast will immediately display as a mandatory central popup on their home screen. Once acknowledged, it will not appear again.

### System Reset Protocol
- **Reset Application:** Located under system settings, this is a highly destructive tool designed only for preparing the environment for a new production launch or sweeping data wipe.
- Executing this command will permanently delete all customers, transactions, staff approvals, active programs, and notifications. 
- The Primary Admin's login credentials and critical Admin Settings will be preserved, and the internal Customer ID counter will accurately reset to VS1000.

---

## 3. Branch Manager Guide

Branch Managers have powerful administrative tools designed to assist in daily branch operations and customer relationship management.

### Advanced Customer Support Tools
- **Customer Phone Update:** If a customer loses access to their registered phone number, navigate to the 'Customer Phone Update' tool. You will need to enter their old number and their new number. The system will send an OTP to the *new* number to ensure security before finalizing the transfer.
- **Customer Report Generation:** To view a complete audit of a customer, navigate to 'Customer Report'. Search for the customer using their 10-digit mobile number. You can view all their personal details, joined programs, and every transaction receipt. Use the "Download Report" button to generate a clean PDF document for the customer.

### Tracking and Risk Assessment
- **Defaulters Tracking:** This tool automatically identifies active customers who have failed to make a payment in the current month. Use this list to follow up on pending collections.
- **Analytics:** Managers can access the Analytics dashboard to view localized bar charts and pie charts detailing Total Collections, Pending Collections, and program popularity.

---

## 4. Super Staff Guide

Super Staff members act as team leads and handle the onboarding of new employees into the digital system.

### Staff Approvals
1. When a new employee downloads the Vastra application and registers as a staff member, they are placed in a "Pending" queue and cannot access the system.
2. Super Staff members must navigate to the 'Approvals' tab.
3. Review the pending requests, verify the employee's identity, and click "Approve" to grant them access to the Standard Staff Dashboard.

---

## 5. Standard Staff Guide

Standard Staff are the backbone of the customer experience, handling all frontline financial interactions.

### Customer Enrollment and Referrals
1. **App Download:** Guide new customers to download the VASTRA 3.0 Android app. You can find the direct download link on the main website's start page.
2. **Referral Tracking:** Your personal **Referral Code** is simply your registered 10-digit mobile number (displayed permanently at the top of your Staff Dashboard).
3. **Earning Incentives:** Instruct the customer to enter your mobile number in the "Referral Staff" field during their signup process. The system will permanently link them to your profile, and your "Total Referrals" count will increase automatically.

### Processing Transactions
1. Navigate to the 'Transactions' tab and search for the customer by their registered phone number.
2. The dashboard will display all active programs the customer is enrolled in.
3. Click "Record Payment" next to the relevant program. Enter the exact payment amount and select the payment method (Cash, Card, or UPI).
4. **Credit Note:** Once recorded, a digital Credit Note is generated. This serves as the official receipt and includes the Customer's Name, Phone Number, and transaction details.

### Program Redemptions
- When a customer completes all installments for a program, the program reaches maturity.
- To issue the final payout or product, search for the customer and locate the completed program.
- Click the "Redeem" action. This officially closes the program, flags it as redeemed in the customer's app, and permanently logs your staff ID as the processor of the redemption in the audit logs.

---

## 6. General System Policies

> [!IMPORTANT]
> **OTP Verification**
> If a customer is not receiving OTPs during signup or phone updates, ensure they have a stable cellular network connection. The platform uses highly secure Firebase phone authentication which requires SMS delivery.

> [!WARNING]
> **Data Privacy and Audit Trails**
> All staff members must adhere to strict data privacy guidelines. Every single action taken within the application—including recording transactions, updating phone numbers, and redeeming programs—is permanently recorded in the system's hidden Audit Logs. These logs are closely monitored by the Primary Admin to ensure operational integrity.
