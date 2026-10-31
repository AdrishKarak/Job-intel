import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="neo-card p-6 bg-paper max-w-md w-full">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl uppercase tracking-tight text-ink">
            Create Account
          </h1>
          <p className="text-xs font-mono text-ink/70 mt-1">
            Start discovering and matching jobs automatically
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              card: "shadow-none border-none p-0",
              formButtonPrimary:
                "bg-ink text-paper hover:bg-neutral-800 rounded-none shadow-neo-sm font-bold text-sm",
            },
          }}
        />
      </div>
    </div>
  );
}
