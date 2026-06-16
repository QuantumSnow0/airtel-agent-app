export const SUPPORT_PHONE = "0700776994";
export const SUPPORT_PHONE_TEL = "tel:0700776994";

export const HELP_FAQS = [
  {
    question: "When do I get paid?",
    answer:
      "Commissions are calculated when a customer is marked as installed. Payouts are recorded by admin and appear in your Payment History.",
  },
  {
    question: "Why is my registration still pending?",
    answer:
      "Pending means the customer is registered but not yet installed. Status updates when the installation team completes or closes the order.",
  },
  {
    question: "What does rejected / duplicate / cancelled mean?",
    answer:
      "These are closed outcomes — the order will not be installed and no commission is earned for that registration.",
  },
  {
    question: "Why did sync fail?",
    answer:
      "Airtel registrations sync to Microsoft Forms when online. Open Records, tap the registration, and use Sync if needed. Check your internet connection.",
  },
  {
    question: "How are earnings calculated?",
    answer:
      "Your wallet shows estimated commission from installed Airtel and Safaricom registrations. Paid amounts come from admin-recorded payouts.",
  },
  {
    question: "How do I turn on notifications?",
    answer:
      "Go to Profile → Notifications, or allow notifications when the app prompts you. You will then receive payment, status, and payout alerts even when the app is closed.",
  },
] as const;
