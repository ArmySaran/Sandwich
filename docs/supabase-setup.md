# Supabase Setup Guide

This guide will help you set up Supabase as the backend for your Sandwich POS system.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in or create an account
4. Click "New project"
5. Fill in your project details:
   - **Name**: `sandwich-pos`
   - **Database Password**: Generate a strong password
   - **Region**: Select closest to your users
6. Click "Create new project"

## 2. Get Project Credentials

Once your project is created:

1. Go to **Settings** > **API**
2. Copy your:
   - **Project URL** (looks like: `https://abcdefghijk.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIs...`)

## 3. Run Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy the entire contents of `sql/schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the schema

This will create:
- All necessary tables (ingredients, menu_items, sales, etc.)
- Row Level Security (RLS) policies
- Database functions and triggers
- Sample data for testing

## 4. Configure Your App

1. Open `js/config.js` in your project
2. Update the configuration values (already configured for this project):

```javascript
const CONFIG = {
    supabase: {
        url: 'https://gefvfsmbbohzsypzckjj.supabase.co', // ✅ Production URL
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnZmc21iYm9oenN5cHpja2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODc4NTIsImV4cCI6MjA3NDI2Mzg1Mn0.PAlwMmS5dBW9zcBjx5P1TH8NU5LkonvBNS75LgeFzxU' // ✅ Production Anon Key
    },
    // ... rest of config
}
```

## 5. Set Up Authentication (Optional)

If you want user authentication:

1. Go to **Authentication** > **Settings**
2. Configure your preferred auth providers
3. Set up email templates
4. Configure redirect URLs for your domain

## 6. Configure Storage (Optional)

For receipt uploads and images:

1. Go to **Storage**
2. Create a new bucket called `receipts`
3. Set bucket policies for file access

## 7. Test Connection

1. Open your app in the browser
2. Check browser console for connection messages
3. Try adding a test ingredient or menu item
4. Verify data appears in your Supabase dashboard

## 8. Environment Variables (GitHub Pages)

For GitHub Pages deployment:

1. Go to your repository **Settings** > **Secrets and variables** > **Actions**
2. Add repository secrets:
   - `SUPABASE_URL`: `https://gefvfsmbbohzsypzckjj.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnZmc21iYm9oenN5cHpja2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODc4NTIsImV4cCI6MjA3NDI2Mzg1Mn0.PAlwMmS5dBW9zcBjx5P1TH8NU5LkonvBNS75LgeFzxU`

Then update your `js/config.js` to use these in production:

```javascript
const CONFIG = {
    supabase: {
        url: window.location.hostname.includes('.github.io')
            ? 'https://gefvfsmbbohzsypzckjj.supabase.co'
            : 'https://gefvfsmbbohzsypzckjj.supabase.co',
        key: window.location.hostname.includes('.github.io')
            ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnZmc21iYm9oenN5cHpja2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODc4NTIsImV4cCI6MjA3NDI2Mzg1Mn0.PAlwMmS5dBW9zcBjx5P1TH8NU5LkonvBNS75LgeFzxU'
            : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnZmc21iYm9oenN5cHpja2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODc4NTIsImV4cCI6MjA3NDI2Mzg1Mn0.PAlwMmS5dBW9zcBjx5P1TH8NU5LkonvBNS75LgeFzxU'
    }
}
```

## 9. Monitor and Optimize

1. Use **Logs** tab to monitor database queries
2. Check **Database** > **Query Performance** for slow queries
3. Set up **Database** > **Backups** for data protection

## Troubleshooting

### Common Issues

1. **"Failed to initialize Supabase client"**
   - Check your URL and key are correct
   - Ensure no trailing slashes in URL
   - Verify project is not paused

2. **"Row Level Security policy violation"**
   - Make sure you're authenticated (if using auth)
   - Check RLS policies are correctly set up
   - Verify user_id fields are properly set

3. **"Table does not exist"**
   - Run the schema.sql file in SQL Editor
   - Check for any SQL errors during execution
   - Verify all migrations completed successfully

4. **CORS errors**
   - Add your domain to allowed origins in Supabase settings
   - For GitHub Pages: add `https://yourusername.github.io`

### Performance Tips

1. **Indexes**: The schema includes optimized indexes
2. **Connection pooling**: Enabled by default
3. **Query optimization**: Use Supabase's query planner
4. **Caching**: Implement client-side caching for better performance

## Security Best Practices

1. **Never expose your service_role key** in client-side code
2. **Use RLS policies** to protect user data
3. **Enable 2FA** on your Supabase account
4. **Regularly rotate** your database password
5. **Monitor logs** for suspicious activity

## Next Steps

Once Supabase is set up:
1. Deploy your app to GitHub Pages
2. Test all functionality end-to-end
3. Set up monitoring and alerts
4. Configure automated backups

For more detailed information, visit the [Supabase Documentation](https://supabase.com/docs).
