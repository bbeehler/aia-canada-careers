import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-5xl">This page doesn’t exist</h1>
      <p className="mt-2 text-steel">The link may be out of date.</p>
      <Link to="/jobs" className="btn-navy mt-6">Browse jobs</Link>
    </div>
  );
}
