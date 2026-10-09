import { PasswordRecovery } from "@/components/password-recovery";
import { fixItBooking as brand } from "@/lib/fix-it-booking";
export const metadata = { title: "Update your password" };
export default function Page() {
  return (
    <main id="main" className="fix-it-content fix-it-auth">
      <h1>A fresh start.</h1>
      <PasswordRecovery reset accountHref={brand.visits} />
    </main>
  );
}
