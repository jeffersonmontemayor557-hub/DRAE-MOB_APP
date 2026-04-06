# System Documentation: Specific Objectives

## DRAE MobApp (CDRRMO Dasmariñas Disaster Risk Awareness Ecosystem)

The study aims to design, develop, test, evaluate, and deploy a **DRAE MobApp** together with its **administrative web dashboard**, supporting City Disaster Risk Reduction and Management Office (CDRRMO) operations for Dasmariñas City. Specifically, it seeks to:

### Design a system that is capable of:

- **Managing users and data with secure cloud-backed storage** — resident profiles (personal information, contact details, optional avatar), household readiness tracking, and linkage of reports to user accounts where applicable, using Supabase authentication and database policies;
- **Supporting hazard reporting and response coordination** — submission of incident reports (hazard type, location, description, photo and optional voice evidence), status tracking, assignment of responders via a **staff** model with **hazard-aware, load-balanced auto-assignment** on new reports, and visibility of advisories and evacuation resources;
- **Delivering preparedness and information services** — preparedness guidebook and infographics (including printable or shareable PNG export), emergency hotline information, evacuation center listings with map context, weather-oriented content, and broadcast of advisories (with notification support where the client platform allows); and
- **Providing accessible client interfaces** — a **mobile application** (Expo / React Native) for residents and field use, and a **responsive web dashboard** (Vite / React) for office staff, suitable for desktop browsers and varying screen sizes.

### Develop the system using appropriate hardware and software requirements (materials), including:

- **Client devices** — smartphones and tablets (Android/iOS via Expo; testing via Expo Go or development builds), and desktop or laptop browsers for the admin dashboard;
- **Developer tooling** — Node.js LTS and npm for installing dependencies and running development servers;
- **Backend and data services** — **Supabase** (PostgreSQL database, Row Level Security, storage for incident evidence, optional realtime subscriptions) rather than a self-hosted PHP stack; the project does not require XAMPP or custom PHP APIs for core operation;
- **Frontend technologies** — TypeScript, React, React Native (Expo SDK), React Navigation, Vite for the admin web client, and structured SQL migrations/schema under `drae-mobapp-app/supabase` for database evolution; and
- **Optional deployment context** — project files may reside under a local web root (e.g. XAMPP `htdocs`) for convenience, but the mobile and admin apps run as Node-based tooling against Supabase in the cloud.

### Test the system using appropriate tools, such as:

- **Functional testing** — checklists covering login/profile flows, incident submission, evidence upload, report history, infographic download/share, evacuation and emergency screens, and admin dashboard views (residents, hazard reports);
- **API and integration testing** — browser developer tools, Supabase dashboard (SQL editor, logs, storage), and where applicable REST/Realtime inspection against Supabase;
- **Usability and acceptance testing** — structured forms or sessions with target users (residents, staff);
- **Cross-device and environment testing** — multiple Android/iOS versions or Expo Go vs development build where notifications or media library behavior differs; major browsers for the admin web client.

### Evaluate the system using standard evaluation criteria, including:

- **Functionality** — correctness of reporting, assignment logic, data display, and admin visibility;
- **Usability** — clarity of navigation, readability of preparedness content, and efficiency of reporting;
- **Reliability and performance** — stability under normal use, reasonable response times over typical networks;
- **Security** — protection of credentials (environment-based keys), least-privilege access via Supabase policies, and safe handling of uploads;
- **User satisfaction** — feedback from stakeholders aligned with recognized software quality principles (e.g., **ISO/IEC 25010**).

### Prepare an implementation plan for system deployment, covering:

- **Installation and setup** — Node.js installation, cloning or copying the project (`drae-mobapp-app`, `drae-admin-web`), `npm install`, environment configuration for Supabase, and schema/storage setup per project documentation (see `SETUP_GUIDE.md`, `START_GUIDE.txt`, and `drae-mobapp-app/SUPABASE_SETUP.md`);
- **User onboarding and training** — brief guides for residents (mobile app) and for office users (admin dashboard);
- **Pilot rollout** — phased release to a limited user group before wider adoption;
- **Maintenance** — dependency updates, Supabase backups and policy review, and monitoring;
- **Feedback collection and continuous improvement** — channels for user input, issue tracking, and iterative releases.

---

*This document is aligned with the repository structure: mobile app (`drae-mobapp-app`), admin web (`drae-admin-web`), and Supabase as the primary backend. Adjust naming (e.g., thesis title, institution) to match your formal manuscript.*
