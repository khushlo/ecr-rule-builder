# ECR Rule Builder

A modern web application for building and managing Electronic Case Reporting (ECR) rules with an intuitive visual interface. Built with Next.js, TypeScript, and modern web technologies.

## 🚀 Features

- **Visual Rule Builder**: Drag-and-drop interface for creating complex ECR rules
- **FHIR Integration**: Built-in FHIR validation and testing tools
- **User Authentication**: Secure login and registration system
- **Rule Management**: Create, edit, delete, and organize rules
- **Dashboard Interface**: Clean, modern dashboard for rule management
- **Real-time Validation**: Instant feedback on rule validity
- **Export/Import**: Support for rule export and import functionality

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Prisma ORM with PostgreSQL/SQLite
- **Authentication**: NextAuth.js
- **API**: Next.js API Routes
- **Validation**: Zod for schema validation
- **FHIR**: Custom FHIR validation utilities

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or later
- npm or yarn
- Git

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/khushlo/ecr-rule-builder.git
cd ecr-rule-builder
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up environment variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="your_database_url"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"

# Add other environment variables as needed
```

### 4. Set up the database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Seed the database
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
ecr-rule-builder/
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── src/
│   ├── app/               # Next.js app directory
│   │   ├── api/           # API routes
│   │   ├── auth/          # Authentication pages
│   │   └── dashboard/     # Dashboard pages
│   ├── components/        # Reusable components
│   │   ├── forms/         # Form components
│   │   ├── layout/        # Layout components
│   │   ├── rules/         # Rule builder components
│   │   └── ui/            # UI components (shadcn/ui)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── store/             # State management
│   └── types/             # TypeScript type definitions
├── docs/                  # Documentation
└── project-plan/          # Project planning (gitignored)
```

## 🔧 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🎯 Usage

### Creating Rules

1. Navigate to the Dashboard
2. Click "Create New Rule"
3. Use the visual rule builder to define your ECR rule logic
4. Test your rule with the FHIR testing tool
5. Save and deploy your rule

### Rule Management

- View all rules in the dashboard
- Edit existing rules using the enhanced rule builder
- Validate rules against FHIR standards
- Export rules for external use

## 🧪 Testing

The application includes FHIR testing tools to validate your rules:

1. Go to the FHIR Testing page in your dashboard
2. Input sample FHIR data
3. Test your rules against the data
4. Review validation results and adjust rules as needed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues

If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/khushlo/ecr-rule-builder/issues) on GitHub.

## 📞 Support

For support and questions, please reach out through:
- GitHub Issues
- Email: khushalwork01@gmail.com

## 🚦 Roadmap

- [ ] Advanced rule templates
- [ ] Rule versioning system
- [ ] Collaborative rule editing
- [ ] Enhanced FHIR resource support
- [ ] API documentation
- [ ] Mobile responsive improvements

---

**Built with ❤️ using Next.js and modern web technologies.**
