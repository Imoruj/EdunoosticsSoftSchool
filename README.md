# Report Card Management System

## Project Overview
This project is a comprehensive Report Card Management System built to provide a seamless user experience for managing student reports.

## Tech Stack
- **Frontend:** Next.js
- **Backend:** Prisma, PostgreSQL
- **Languages:** TypeScript
- **Styling:** Tailwind CSS

## Features
- User Authentication via JWT
- Responsive Design for mobile and desktop
- Create, Read, Update, and Delete (CRUD) functionality for student report cards
- Admin dashboard for managing student records
- Export reports in PDF format
- And much more based on the dependencies specified in package.json!

## Environment Configuration
- Ensure to have PostgreSQL installed and running.
- Create a `.env` file in the root of the project with the following variables:
  - `DATABASE_URL=` (PostgreSQL connection string)
  - `JWT_SECRET=` (Secret key for JWT)
  - Other environment variables as required for your deployment.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Imoruj/ReportCardManagementSystem.git
   ```
2. Navigate to the project directory:
   ```bash
   cd ReportCardManagementSystem
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Contributing
Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for more information.