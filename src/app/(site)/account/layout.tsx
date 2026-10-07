import type { Metadata } from "next";
import { AccountTabs } from "./AccountTabs";

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s · Your account" },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 md:pt-14">
      <p className="eyebrow">Your account</p>
      <AccountTabs />
      <div className="mt-8">{children}</div>
    </div>
  );
}
