import type { BookingNotification } from "./booking-recovery";
export function bookingNotificationCopy(status?: BookingNotification | null) {
  switch (status) {
    case "queued": return "Confirmation is queued for follow-up. Email delivery has not been confirmed.";
    case "accepted": return "The email provider accepted the confirmation. Delivery has not been confirmed.";
    case "delivered": return "The email provider reports the confirmation delivered. This does not confirm it was read.";
    case "attention": return "Confirmation email needs attention. Your saved booking remains available in your appointments.";
    default: return "Email status is unavailable. Your saved booking remains available in your appointments.";
  }
}
