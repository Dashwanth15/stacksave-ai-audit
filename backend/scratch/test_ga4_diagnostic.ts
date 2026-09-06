import dotenv from 'dotenv';
dotenv.config();

import { GoogleAnalyticsService } from '../src/services/googleAnalyticsService';

async function run() {
  console.log('=== GA4 BACKEND DIAGNOSTIC ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('GA4_PROPERTY_ID configured:', !!process.env.GA4_PROPERTY_ID || !!process.env.GA_PROPERTY_ID);
  console.log('GOOGLE_SERVICE_ACCOUNT_KEY configured:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  console.log('GOOGLE_APPLICATION_CREDENTIALS configured:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  console.log('\n--- 1. Analytics Health ---');
  const health = await GoogleAnalyticsService.getAnalyticsHealth();
  console.log('Health Status:', health.status);
  console.log('GA4 Tracking Measurement ID:', health.dependencies.ga4Tracking.measurementId);
  console.log('GA4 Data API Status:', health.dependencies.ga4DataApi.status);
  console.log('GA4 Data API Property ID:', health.dependencies.ga4DataApi.propertyId);
  console.log('GA4 Realtime Status:', health.dependencies.ga4Realtime.status);
  console.log('Search Console Status:', health.dependencies.searchConsole.status);

  console.log('\n--- 2. Historical Analytics (7days) ---');
  const historical = await GoogleAnalyticsService.getHistoricalAnalytics('7days');
  console.log('Historical State:', historical.state);
  console.log('Total Users:', historical.totalUsers);
  console.log('Active Users:', historical.activeUsers);
  console.log('Sessions:', historical.sessions);
  console.log('Page Views:', historical.screenPageViews);

  console.log('\n--- 3. Realtime Analytics ---');
  const realtime = await GoogleAnalyticsService.getRealtimeAnalytics();
  console.log('Realtime State:', realtime.state);
  console.log('Active Users (30m):', realtime.activeUsersLast30Min);
  console.log('Realtime Page Views:', realtime.realtimePageViews);
  console.log('Realtime Event Count:', realtime.realtimeEventCount);
}

run().catch(console.error);
