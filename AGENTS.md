# Mobile Developer Guidelines: Architecture, Folder Structure, and Coding Practices

Welcome to the Tionix ERP Mobile codebase (React Native + Expo). This document outlines the project structure, styling rules, coding standards, and best practices. Please follow these guidelines closely to maintain type safety, clean code execution, and system maintainability.

---

## 1. Folder Structure Overview

We follow a modular, domain-driven structure to organize the mobile app code. Shared UI components reside in the global directories, while feature-specific logic is isolated into domain modules.

```
AttendanceApp/
├── src/
│   ├── components/          # Highly reusable global UI components (AppCard, Shimmer, AppBar)
│   ├── config/              # Central configuration (API endpoints, environment settings)
│   ├── navigation/          # Navigation container, stack definitions, and path refs (AppNavigator)
│   ├── services/            # Global API client, session managers, and local storage wrappers
│   ├── theme/               # Global styling system (Colors, Typography, spacing)
│   ├── utils/               # Helpers (responsive scaling, date utils, report downloaders)
│   └── modules/             # Domain-Driven Modules (Core Feature Logic)
│       ├── attendance/      # Attendance punching, logs, and geofencing
│       ├── auth/            # Sign in, sign out, and password resetting
│       ├── daily-task/      # Task logging and management
│       ├── leave-request/   # Leave balance tracking and apply leave forms
│       ├── loan-request/    # Loan history list and EMI amortization calculator
│       ├── notifications/   # System alerts and notification screen
│       ├── personal-work/   # Personal break tracking and requests
│       └── profile/         # User settings and personal details
```

### Module Folder Structure Pattern

Every domain module under `src/modules/[module-name]` must adhere to this naming and folder pattern:

- **Module Folder Name**: Must use kebab-case (e.g., `leave-request`, `loan-request`, `personal-work`).
- **Sub-folders**:
  - `screens/`: Contains all TSX screen components exclusive to the module (e.g., `ApplyLoanScreen.tsx`).
  - `services/`: Contains API wrapper methods, cache sync methods, and normalization logic (e.g., `loan-request.service.ts`, `loan.ts`).
  - `context/` (optional): Module-specific state providers.
  - `hooks/` (optional): Module-specific custom React hooks.

> [!IMPORTANT]
> Never add feature-specific screens directly to the global `src/components` or `src/navigation`. Keep them isolated inside `src/modules/[module-name]/screens`.

---

## 2. Coding Practices & Conventions

### A. Kebab-Case File and Folder Naming
- All module directories must be in kebab-case.
- Module-specific services and business files must use kebab-case (e.g., `personal-work.service.ts`, `leave-request.service.ts`).

### B. Database Property Naming and Case Rules
To maintain strict alignment with the backend and PostgreSQL database schemas, avoid converting database column names to camelCase on the frontend/mobile client:
- **Username Naming**: Always use `username` (fully lowercase). Do not use camelCase `userName` or snake_case `user_name` in types, request bodies, or local state variables.
- **Primary Keys**: Always use `pk_user_id` or similar identifiers (fully lowercase snake_case) where returned or sent directly to the database.
- **Variable Mapping**: Ensure request bodies and types mapping to backend API structures match database properties exactly (e.g., `fk_emp_id`, `fk_set_id`, `form`, `rights`, `id`).

### C. Tablet vs. Phone Responsiveness
To support both tablets and phone form-factors, components and screens must be adaptive:
- **Responsive Dimensions**: Avoid hardcoded dimensions where possible. Use logical layouts or helpers like `moderateScale` (from `src/utils/responsive.ts`) for margins, padding, and font sizes.
- **Split Layouts**: For screens displaying lists and complex detail layouts (e.g. `LoanDetailsScreen.tsx`), provide a side-by-side split screen view on tablets (defined using window dimension checks `width >= 600`) and fall back to vertical scroll stacks on phones.

### D. Asynchronous Session Management
- Tokens and sessions are retrieved asynchronously through `getAuthSession` from `src/modules/auth/services/auth`. Always verify session presence before invoking protected routes.
- Hook into the session expiry handler using `setSessionExpiredHandler` inside `AppNavigator.tsx` to handle authentication failure and redirect to the login screen gracefully.

---

## 3. Styling & Theme System

- We use custom styling loaded via `Theme` and `Colors` from `src/theme/colors` and `Typography` from `src/theme/typography`.
- Avoid hardcoding color hex codes directly in screen styles. Always refer to semantic color names (e.g. `Colors.primary`, `Colors.textSecondary`, `Colors.warning`).
- Use linear gradients (`Colors.primaryGradient`) for premium layouts.

updated at 22/06/2026
