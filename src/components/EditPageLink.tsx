import { Link } from "./L";
import { useAuth } from "../lib/auth";

// Floating shortcut for admins: jump to the editor for this page's wording.
export default function EditPageLink({ section }: { section: string }) {
  const { profile } = useAuth();
  if (profile?.role !== "admin") return null;
  return (
    <Link to={`/admin/content#${section}`}
      className="fixed bottom-5 right-5 z-50 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-navy-deep">
      Edit this page
    </Link>
  );
}
