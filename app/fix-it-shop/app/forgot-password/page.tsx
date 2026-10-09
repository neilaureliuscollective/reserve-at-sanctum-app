import { PasswordRecovery } from "@/components/password-recovery";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const metadata = { title: "Recover your account" };
export default function Page() {
  return (
    <main id="main" className="fix-it-content fix-it-auth">
      <h1>Recover your account.</h1>
      <PasswordRecovery
        recoveryReturn={brand.base + "/reset-password"}
        accountHref={brand.signin}
      />
    </main>
  );
}
