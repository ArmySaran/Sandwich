# GitHub Pages Deployment Guide

Complete guide for deploying your Sandwich POS system to GitHub Pages with automated CI/CD.

## Prerequisites

- GitHub account
- Git installed on your computer
- Supabase project set up (see `supabase-setup.md`)

## 1. Prepare Your Repository

### Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click **"New repository"**
3. Repository details:
   - **Name**: `sandwich-pos` (or your preferred name)
   - **Description**: "Modern restaurant POS system with real-time analytics"
   - **Visibility**: Public (required for free GitHub Pages)
   - ✅ **Add a README file**
   - **License**: MIT License
4. Click **"Create repository"**

### Clone and Set Up Locally

```bash
# Clone your repository
git clone https://github.com/yourusername/sandwich-pos.git
cd sandwich-pos

# Copy your project files
# Copy all files from your SW directory to this repository

# Add files to git
git add .
git commit -m "Initial commit: Complete POS system with Supabase integration"
git push origin main
```

## 2. Configure GitHub Pages

### Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select:
   - **Deploy from a branch**
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click **Save**

### Custom Domain (Optional)

If you have a custom domain:

1. In **Pages** settings, add your **Custom domain**
2. Create a `CNAME` file in your repository root:
   ```
   yourdomain.com
   ```
3. Configure DNS with your domain provider:
   - Add CNAME record pointing to `yourusername.github.io`

## 3. Automated Deployment Pipeline

The included `.github/workflows/deploy.yml` provides:

- **Build validation** (HTML, JavaScript syntax checking)
- **Automated deployment** to GitHub Pages
- **Health checks** after deployment
- **Performance auditing** (optional)

### Workflow Features

```yaml
# Triggered on:
- Push to main branch
- Pull requests
- Manual workflow dispatch

# Includes:
- Code validation
- Build optimization
- Automated deployment
- Health monitoring
```

## 4. Environment Configuration

### Production Configuration

Update `js/config.js` for production:

```javascript
const CONFIG = {
    supabase: {
        // Your actual Supabase credentials
        url: 'https://gefvfsmbbohzsypzckjj.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZnZmc21iYm9oenN5cHpja2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODc4NTIsImV4cCI6MjA3NDI2Mzg1Mn0.PAlwMmS5dBW9zcBjx5P1TH8NU5LkonvBNS75LgeFzxU'
    },

    // Production settings
    app: {
        name: '🥪 Your Restaurant Name',
        version: '2.0.0',
        currency: 'THB'
    }
}

// Environment detection
CONFIG.isProduction = window.location.hostname.includes('.github.io')
```

### Secure Secrets (Advanced)

For additional security, use GitHub repository secrets:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add repository secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

Then modify your config to use environment variables in production.

## 5. Domain and HTTPS

### Automatic HTTPS

GitHub Pages automatically provides HTTPS:
- Your site will be available at `https://yourusername.github.io/sandwich-pos`
- HTTPS is enforced by default
- SSL certificate is automatically managed

### Custom Domain HTTPS

For custom domains:
1. Add domain in Pages settings
2. Wait for DNS propagation (up to 24 hours)
3. Enable **"Enforce HTTPS"** once available

## 6. Performance Optimization

### Caching Strategy

The service worker (`sw.js`) implements:
- **Static caching** for app shell
- **Dynamic caching** for API responses
- **Network-first** for real-time data
- **Cache-first** for static assets

### CDN and Performance

GitHub Pages includes:
- Global CDN distribution
- Automatic compression
- Browser caching headers
- Fast global loading times

## 7. Monitoring and Analytics

### GitHub Actions Monitoring

Monitor deployments:
1. Go to **Actions** tab in your repository
2. View deployment history and logs
3. Check for failed builds or deployments

### Application Monitoring

Add monitoring to your app:

```javascript
// Add to your config.js
CONFIG.monitoring = {
    enabled: CONFIG.isProduction,
    endpoint: 'your-analytics-endpoint'
}

// Track errors and usage
window.addEventListener('error', (error) => {
    if (CONFIG.monitoring.enabled) {
        // Send error to monitoring service
        console.error('Application error:', error)
    }
})
```

## 8. Deployment Process

### Automatic Deployment

Every push to main branch triggers:

1. **Code Validation**
   - HTML structure validation
   - JavaScript syntax checking
   - Basic quality checks

2. **Build Process**
   - File optimization
   - Build info generation
   - Asset preparation

3. **Deployment**
   - Upload to GitHub Pages
   - DNS propagation
   - Cache invalidation

4. **Health Checks**
   - Site accessibility testing
   - Essential file verification
   - Performance validation

### Manual Deployment

To deploy manually:

```bash
# Make your changes
git add .
git commit -m "Update: your changes description"
git push origin main

# GitHub Actions will automatically deploy
```

## 9. Testing Your Deployment

### Pre-deployment Testing

```bash
# Local testing
python -m http.server 8000
# Visit http://localhost:8000

# Or using Node.js
npx serve .
# Visit http://localhost:3000
```

### Post-deployment Validation

1. **Functionality Testing**
   - Test POS operations
   - Verify data persistence
   - Check offline functionality

2. **Performance Testing**
   - Page load speed
   - Mobile responsiveness
   - PWA installation

3. **Browser Compatibility**
   - Test on multiple browsers
   - Verify mobile experience
   - Check PWA features

## 10. Maintenance and Updates

### Regular Updates

```bash
# Update your code
git pull origin main
# Make changes
git add .
git commit -m "Update: feature or fix description"
git push origin main
```

### Monitoring Health

- Check GitHub Actions for build failures
- Monitor Supabase dashboard for database health
- Review user feedback and error reports
- Keep dependencies updated

### Backup Strategy

1. **Code**: Automatically backed up on GitHub
2. **Database**: Configure Supabase automatic backups
3. **Settings**: Document configuration in repository

## Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   ```
   Check Actions tab for detailed error logs
   Verify file syntax and structure
   Ensure all dependencies are available
   ```

2. **404 Errors**
   ```
   Check GitHub Pages settings
   Verify main branch is selected
   Ensure index.html is in root directory
   ```

3. **Service Worker Issues**
   ```
   Clear browser cache
   Check browser console for SW errors
   Verify HTTPS is enabled
   ```

### Performance Issues

1. **Slow Loading**
   - Optimize images and assets
   - Review service worker caching
   - Check CDN configuration

2. **Database Latency**
   - Review Supabase region settings
   - Optimize database queries
   - Implement better caching

## Next Steps

After successful deployment:

1. **Test Thoroughly**: Complete end-to-end testing
2. **User Training**: Prepare user documentation
3. **Monitoring**: Set up error tracking and analytics
4. **Marketing**: Share your live application
5. **Iteration**: Collect feedback and improve

Your Sandwich POS system will be live at:
`https://yourusername.github.io/sandwich-pos`

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Progressive Web Apps Guide](https://web.dev/progressive-web-apps/)
- [Supabase Documentation](https://supabase.com/docs)
