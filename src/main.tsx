import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import './design/tokens.css';
import './design/components.css';
import './design/app-layout.css';
import './styles.css';
import { AuthGate } from './auth';
import { Page, Shell } from './Shell';
import { Accounts } from './pages/Accounts';
import { AccountDetail } from './pages/AccountDetail';
import { Activity } from './pages/Activity';
import { Dashboard } from './pages/Dashboard';
import { Demos } from './pages/Demos';
import { Login } from './pages/Login';
import { Plans } from './pages/Plans';
import { Staff } from './pages/Staff';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate signedOut={(onSignedIn, notice) => <Login onSignedIn={onSignedIn} notice={notice} />}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="accounts/:id" element={<AccountDetail />} />
            <Route path="demo-requests" element={<Demos />} />
            <Route path="plans" element={<Plans />} />
            <Route path="staff" element={<Staff />} />
            <Route path="activity" element={<Activity />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);


function NotFound() {
  return (
    <Page title="Page not found">
      <p>There is nothing at this address. <Link to="/" className="link-btn">Go to the dashboard</Link></p>
    </Page>
  );
}
