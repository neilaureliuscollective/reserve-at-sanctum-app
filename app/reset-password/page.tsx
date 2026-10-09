import { PasswordRecovery } from "@/components/password-recovery";
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return (
    <main id="main" className="inner-page section">
      <h1>A fresh start.</h1>
      <PasswordRecovery reset />
    </main>
  );
}
