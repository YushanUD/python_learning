import AuthForms from "@/components/AuthForms";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Login / Sign Up</h1>
        <p className="text-slate-600">
          New students can create an account first. Returning students and
          admins can log in with nickname and password.
        </p>
      </div>
      <AuthForms />
    </section>
  );
}
