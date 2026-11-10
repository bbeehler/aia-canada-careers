import { Link } from "../components/L";
import PageHero, { heroPrimary, heroSecondary } from "../components/PageHero";

import { t } from "../lib/i18n";
export default function NotFound() {
  return (
    <PageHero tag={t("Page not found")} title={t("This page doesn’t exist")} body={t("The link may be out of date.")}
      actions={<>
        <Link to="/jobs" className={heroPrimary}>{t("Browse jobs")}</Link>
        <Link to="/" className={heroSecondary}>{t("Go to the home page")}</Link>
      </>} />
  );
}
