# MongoDB Atlas Setup Guide

## Current Connection String
```
mongodb+srv://broraise:zQwkQnESEqw8UrQi@resumegpt.pj4ez2w.mongodb.net/Broraise
```

## Troubleshooting "bad auth" Error

The error "bad auth : authentication failed" means MongoDB Atlas is rejecting your credentials. Here's how to fix it:

### Step 1: Verify Database User
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to **Database Access** (left sidebar)
3. Check if a user named `broraise` exists
4. If it doesn't exist, create it:
   - Click "Add New Database User"
   - Username: `broraise`
   - Password: `zQwkQnESEqw8UrQi` (or generate a new one)
   - Database User Privileges: "Atlas admin" or "Read and write to any database"
   - Click "Add User"

### Step 2: Verify Network Access
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. For development, you can use:
   - `0.0.0.0/0` (allows access from anywhere - use only for development)
   - Or add your specific IP address
4. Click "Confirm"

### Step 3: Verify Database Name
1. Go to **Database** (left sidebar)
2. Click "Browse Collections"
3. Check if database `Broraise` exists (case-sensitive)
4. If it doesn't exist, it will be created automatically on first connection

### Step 4: Get Correct Connection String
1. Go to **Database** (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with `Broraise`

### Step 5: Update .env.local
Update the `MONGODB_URI` in `.env.local` with the correct connection string.

### Common Issues:
- **Wrong password**: Make sure the password matches exactly (no extra spaces)
- **User doesn't exist**: Create the database user in Atlas
- **IP not whitelisted**: Add your IP to Network Access
- **Database name mismatch**: Ensure the database name in the connection string matches

### Test Connection
After updating, test the connection by visiting:
http://localhost:3001/api/test-db

You should see: `{"success":true,"message":"Database connection successful"}`



