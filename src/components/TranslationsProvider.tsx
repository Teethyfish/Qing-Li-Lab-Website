"use client";

import { NextIntlClientProvider } from "next-intl";

type Props = {
  locale: string;
  messages: any;
  children: React.ReactNode;
};

export default function TranslationsProvider({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
