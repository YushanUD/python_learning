import Link from "next/link";

export default function Home() {
  return (
    <section className="grid gap-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-[2fr_1fr]">
      <div className="space-y-5">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-600">
          MISY 225 Introduction to Python
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Python Learning
        </h1>
        <p className="text-slate-600">
          Professor: Yushan Liu
          <br />
          Term: Spring Semester
        </p>
        <p className="max-w-3xl text-slate-700">
          This course portal helps students build Python fundamentals through
          concise reading modules and short coding tasks. You can sign up,
          practice exercises, receive automatic feedback, and submit your score
          summary to the class ranking board.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/learn"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Explore Learning Area
          </Link>
          <Link
            href="/ranking"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            View Ranking
          </Link>
        </div>
      </div>

      <aside className="rounded-lg border border-blue-100 bg-blue-50 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Quick Start</h2>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-700">
          <li>Create your student account on the login page.</li>
          <li>Read each module and complete the exercises.</li>
          <li>Submit answers to calculate your average score.</li>
          <li>Check the ranking board to compare progress.</li>
        </ol>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </aside>
    </section>
  );
}
