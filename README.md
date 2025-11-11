# BroRaise - Complaint Management System

A comprehensive web platform for managing student complaints, suggestions, and feedback with full transparency and accountability.

## Features

### Student Portal
- Submit complaints with attachments
- Track complaint history
- Real-time notifications
- Two-way communication with staff
- Rate and provide feedback after resolution

### Staff Portal
- Dashboard with assigned complaints
- Update complaint status
- Assign complaints to team members
- Internal notes and communication
- Analytics and performance metrics

### Admin Portal
- User management
- Category management
- System settings
- Comprehensive analytics
- Export reports

### Management Dashboard
- Organization-wide insights
- KPIs and performance metrics
- Visual reports and charts
- Monthly summary emails

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + OAuth (Google)
- **File Storage**: Cloudinary
- **Email**: SendGrid
- **Charts**: Recharts
- **Real-time**: Socket.io (ready for implementation)

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB instance (local or cloud)
- Cloudinary account
- SendGrid account (optional, for email notifications)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd broraise
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- MongoDB connection string
- JWT secret
- Cloudinary credentials
- SendGrid API key (optional)
- Application URL

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Roles

The system supports four user roles:
- **Student**: Submit and track complaints
- **Staff**: Handle and resolve complaints
- **Admin**: Full system access
- **Management**: View analytics and reports

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Complaints
- `GET /api/complaints` - List complaints (with filters)
- `POST /api/complaints` - Create complaint
- `GET /api/complaints/[id]` - Get complaint details
- `PATCH /api/complaints/[id]` - Update complaint
- `POST /api/complaints/[id]/comments` - Add comment
- `GET /api/complaints/[id]/comments` - Get comments
- `POST /api/complaints/[id]/feedback` - Submit feedback

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin only)
- `PATCH /api/categories/[id]` - Update category (admin only)
- `DELETE /api/categories/[id]` - Delete category (admin only)

### Users
- `GET /api/users` - List users (admin/management only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user

### Analytics
- `GET /api/analytics` - Get analytics data (admin/management/staff only)

### Upload
- `POST /api/upload` - Upload file to Cloudinary

## Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Input validation with Zod
- Encrypted file uploads
- Audit logging for all complaint updates

## Deployment

The application is ready for deployment on Render or similar platforms:

1. Set up MongoDB Atlas or your preferred MongoDB hosting
2. Configure environment variables in your hosting platform
3. Deploy the Next.js application
4. Set up Cloudinary for file storage
5. Configure SendGrid for email notifications

## Future Enhancements

- AI Chatbot for automated acknowledgment
- Slack/Telegram integration
- Voice complaint submission
- Mobile app (React Native)
- Predictive analytics
- Advanced AI categorization

## License

Copyright © 2025 Brototype. All rights reserved.

## Support

For issues and questions, please contact the development team.
