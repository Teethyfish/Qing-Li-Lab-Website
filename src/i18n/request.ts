import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales } from './config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // Get locale from user's database preference
  const session = await getServerSession(authOptions);
  let locale: string = defaultLocale;
  const cookieLocale = (await cookies()).get('site-locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) locale = cookieLocale;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { locale: true }
    });
    if (user?.locale && locales.includes(user.locale as any)) {
      locale = user.locale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
