# ZK-Vault Admin Monitoring Dashboard Setup Guide

## Overview

This guide covers the implementation of the comprehensive admin monitoring
dashboard for ZK-Vault, which provides real-time analytics, system health
monitoring, and administrative controls.

## Implementation Status

### ✅ Completed Items

1. **Enhanced Firestore Security Rules** - Comprehensive security rules with
   admin access controls
2. **Backend Analytics Functions** - User analytics, system health, and
   monitoring functions
3. **Admin Service Layer** - TypeScript service for interacting with analytics
   functions
4. **Admin Dashboard Components** - Vue.js components for the monitoring
   interface

### 🔧 Setup Required

The following setup steps are needed to integrate the admin dashboard:

## 1. Firebase Dependencies

Add the required Firebase dependencies to your `package.json`:

```json
{
  "dependencies": {
    "firebase": "^10.7.0",
    "@firebase/auth": "^1.5.0",
    "@firebase/firestore": "^4.4.0",
    "@firebase/functions": "^0.10.0"
  }
}
```

## 2. Vue.js Dependencies

Ensure your Vue.js setup includes:

```json
{
  "dependencies": {
    "vue": "^3.3.0",
    "@vue/runtime-core": "^3.3.0"
  },
  "devDependencies": {
    "@vue/compiler-sfc": "^3.3.0",
    "typescript": "^5.0.0"
  }
}
```

## 3. Admin User Setup

Create admin users in Firestore by adding documents to the `admins` collection:

```javascript
// Add to Firestore manually or via Cloud Function
const adminData = {
  email: 'admin@zkvault.com',
  level: 'super', // or "admin"
  createdAt: new Date(),
  permissions: ['analytics', 'user_management', 'system_control'],
};

// Add to /admins/{userId} document
await db.collection('admins').doc(userId).set(adminData);
```

## 4. Firebase Custom Claims (Optional)

For better performance, set up custom claims for admin users:

```javascript
// Cloud Function to set admin claims
export const setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be logged in'
    );
  }

  // Verify caller is super admin
  const callerDoc = await admin
    .firestore()
    .collection('admins')
    .doc(context.auth.uid)
    .get();

  if (!callerDoc.exists || callerDoc.data()?.level !== 'super') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Must be super admin'
    );
  }

  // Set custom claim
  await admin.auth().setCustomUserClaims(data.userId, {
    isAdmin: true,
    adminLevel: data.level || 'admin',
  });

  return { success: true };
});
```

## 5. Router Configuration

Add admin routes to your Vue Router:

```typescript
// router.ts
import { createRouter, createWebHistory } from 'vue-router';
import AdminDashboard from './components/admin/AdminDashboard.vue';

const routes = [
  // ... existing routes
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Admin route guard
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAdmin) {
    const user = getAuth().currentUser;
    if (!user) {
      next('/login');
      return;
    }

    const token = await user.getIdTokenResult();
    if (!token.claims.isAdmin) {
      next('/unauthorized');
      return;
    }
  }
  next();
});

export default router;
```

## 6. Component Integration

Register the admin service and components:

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');
```

## 7. Environment Configuration

Add Firebase configuration to your environment:

```typescript
// firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
```

## Component Architecture

### AdminDashboard.vue

- Main dashboard component with metrics grid
- Real-time data loading and refresh capabilities
- Responsive design with mobile optimization
- Admin action controls (purge users, optimize system)

### MetricCard.vue

- Reusable component for displaying KPIs
- Support for trend indicators and multiple formats
- Hover effects and interactive elements

### ActivityChart.vue

- Canvas-based line chart for activity trends
- Interactive tooltips and legend
- Responsive and scalable visualization

### SegmentationChart.vue

- Canvas-based donut chart for user segmentation
- Interactive highlighting and tooltips
- Detailed legend with user definitions

## Data Flow

```
1. User accesses /admin route
2. Router guard checks admin permissions
3. AdminDashboard component loads
4. Service layer calls Firebase Functions
5. Functions retrieve data from Firestore
6. Data flows back to components
7. Charts and metrics render
8. Real-time updates via periodic refresh
```

## Security Features

### Firestore Rules

- Admin-only access to analytics collections
- Rate limiting on admin operations
- Size limits on documents
- Audit trail for admin actions

### Function Security

- Authentication required for all admin functions
- Admin role verification
- Rate limiting per user
- Input validation and sanitization

## Performance Optimizations

1. **Caching**: Analytics reports cached for 5 minutes
2. **Pagination**: Large datasets paginated automatically
3. **Lazy Loading**: Charts load on demand
4. **Compression**: Data compressed for network transfer
5. **Batching**: Multiple metrics retrieved in single call

## Monitoring Capabilities

### User Analytics

- Total/active/new user counts
- User growth rates and trends
- Geographic distribution
- Retention rate analysis
- Feature usage statistics

### System Health

- Response time monitoring
- Error rate tracking
- Resource usage (CPU, memory, disk)
- Active connection counts
- System uptime tracking

### Storage Analytics

- File upload statistics
- Storage usage by type
- Sharing activity metrics
- Vault item creation trends

## Admin Actions

### User Management

- Purge inactive users (configurable threshold)
- View user details and activity
- Disable/enable user accounts

### System Maintenance

- Run system optimization
- Clear cache and temporary data
- Database maintenance operations
- Performance tuning

### Monitoring Tools

- Real-time health checks
- Alert management
- Export analytics data
- Generate custom reports

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**

   - Verify admin user is in `/admins` collection
   - Check custom claims are set correctly
   - Ensure Firestore rules are deployed

2. **Chart Not Rendering**

   - Check canvas element is available
   - Verify data format matches interface
   - Ensure container has proper dimensions

3. **Functions Timeout**
   - Increase function timeout in firebase.json
   - Optimize queries with proper indexing
   - Implement result caching

### Debugging Tips

```typescript
// Enable debug logging
import { connectFunctionsEmulator } from 'firebase/functions';

if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Deployment

1. Deploy Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

2. Deploy Cloud Functions:

```bash
firebase deploy --only functions
```

3. Build and deploy web app:

```bash
npm run build
firebase deploy --only hosting
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live data
2. **Advanced Analytics**: Machine learning insights
3. **Custom Dashboards**: User-configurable widgets
4. **Alert System**: Automated notifications
5. **API Integration**: Third-party monitoring tools
6. **Mobile App**: Native admin dashboard

## Support

For questions or issues with the admin dashboard:

1. Check this setup guide
2. Review component documentation
3. Check Firebase Functions logs
4. Verify Firestore security rules
5. Contact development team

---

## Quick Start Checklist

- [ ] Install Firebase dependencies
- [ ] Configure Firebase in your app
- [ ] Create admin users in Firestore
- [ ] Deploy security rules
- [ ] Deploy Cloud Functions
- [ ] Add admin routes to router
- [ ] Test admin access and permissions
- [ ] Verify charts render correctly
- [ ] Test admin actions
- [ ] Configure monitoring alerts
