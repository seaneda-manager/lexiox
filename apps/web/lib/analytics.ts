// normalized utf8
// apps/web/lib/analytics.ts
import mixpanel from 'mixpanel-browser';

// ?占쎄꼍 蹂??湲곕컲?占쎈줈 analytics 耳쒓퀬 ?占쎄린
export const isAnalyticsEnabled =
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

// 珥덇린??(?占쎈줈?占쎌뀡 + ENABLE_ANALYTICS=true ???占쎈쭔 ?占쏀뻾)
export function initAnalytics() {
  if (isAnalyticsEnabled) {
    mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? '', {
      track_pageview: true,
      persistence: 'localStorage',
    });
  }
}

// ?占쎈깽???占쎈옒???占쎌닔
export function track(event: string, props?: Record<string, any>) {
  if (isAnalyticsEnabled) {
    mixpanel.track(event, props);
  }
}

// ?占쎌슜??ID ?占쎌젙
export function identify(userId: string) {
  if (isAnalyticsEnabled) {
    mixpanel.identify(userId);
  }
}

// ?占쎌슜???占쎌꽦 ?占쎈줉
export function setUserProperties(props: Record<string, any>) {
  if (isAnalyticsEnabled) {
    mixpanel.people.set(props);
  }
}





