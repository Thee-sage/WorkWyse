import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { ReportsFeedPage } from "./pages/ReportsFeedPage";
import { ReportDetailPage } from "./pages/ReportDetailPage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { CompanyProfilePage } from "./pages/CompanyProfilePage";
import { SubmitReportPage } from "./pages/SubmitReportPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: LandingPage },
      { path: "reports", Component: ReportsFeedPage },
      { path: "reports/:id", Component: ReportDetailPage },
      { path: "companies", Component: CompaniesPage },
      { path: "companies/:slug", Component: CompanyProfilePage },
      { path: "submit", Component: SubmitReportPage },
      { path: "profile", Component: UserProfilePage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
