import { useLocation } from "react-router-dom";
import { BulletinHistoryPage } from "./BulletinHistoryPage";
import { BulletinPublicationPage } from "./BulletinPublicationPage";
import { BulletinValidationPage } from "./BulletinValidationPage";
import { BulletinsPage } from "./BulletinsPage";

export function BulletinsListPage() {
  const { pathname } = useLocation();

  if (pathname.endsWith("/validation")) return <BulletinValidationPage />;
  if (pathname.endsWith("/publication")) return <BulletinPublicationPage />;
  if (pathname.endsWith("/historique")) return <BulletinHistoryPage />;

  return <BulletinsPage />;
}
