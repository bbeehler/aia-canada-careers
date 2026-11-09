import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireRole from "./components/RequireRole";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import SignIn from "./pages/SignIn";
import Employers from "./pages/Employers";
import EmployerDashboard from "./pages/EmployerDashboard";
import JobForm from "./pages/JobForm";
import Applications from "./pages/Applications";
import MyApplications from "./pages/MyApplications";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Quiz from "./pages/Quiz";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route path="employers" element={<Employers />} />
        <Route path="employer" element={<RequireRole roles={["employer", "admin"]}><EmployerDashboard /></RequireRole>} />
        <Route path="employer/jobs/new" element={<RequireRole roles={["employer", "admin"]}><JobForm /></RequireRole>} />
        <Route path="employer/jobs/:id/edit" element={<RequireRole roles={["employer", "admin"]}><JobForm /></RequireRole>} />
        <Route path="employer/jobs/:id/applications" element={<RequireRole roles={["employer", "admin"]}><Applications /></RequireRole>} />
        <Route path="applications" element={<RequireRole roles={["candidate"]}><MyApplications /></RequireRole>} />
        <Route path="admin" element={<RequireRole roles={["admin"]}><Admin /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
