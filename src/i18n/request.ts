import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // This function runs on the server for each request
  // and loads the appropriate locale messages
  let locale = await requestLocale;

  // Fallback to default locale if undefined
  if (!locale) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
