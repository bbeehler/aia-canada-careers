import { Link } from "react-router-dom";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";

export default function NotFound() {
  return (
    <PageHero tag="Page not found" title="This page doesn’t exist" body="The link may be out of date."
      actions={<>
        <Link to="/jobs" className={heroPrimary}>Browse jobs</Link>
        <Link to="/" className={heroSecondary}>Go to the home page</Link>
      </>} />
  );
}
