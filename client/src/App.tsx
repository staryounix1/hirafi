// ── جدول مسارات «حِرْفي» — 15 مساراً ────────────────────────────────────────
// اسم الملف يأتي من الاتفاق المعلن في المواصفة، والمسار الجذري يشرح الفكرة لمن
// يفتح الرابط أول مرة. الحاجز `Protected` يغلّف كل مسار يحتاج جلسة.
import { Route, Switch } from "wouter";
import { Protected, ProviderOnly } from "@/components/hirfi/shell";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import RequestNew from "./pages/RequestNew";
import RequestDetail from "./pages/RequestDetail";
import Browse from "./pages/Browse";
import Offers from "./pages/Offers";
import Profile from "./pages/Profile";
import ProviderPublic from "./pages/ProviderPublic";
import Wallet from "./pages/Wallet";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/onboarding">
        <Protected>
          <Onboarding />
        </Protected>
      </Route>
      <Route path="/dashboard">
        <Protected>
          <Dashboard />
        </Protected>
      </Route>
      <Route path="/requests/new">
        <Protected>
          <RequestNew />
        </Protected>
      </Route>
      <Route path="/requests/:id">
        <Protected>
          <RequestDetail />
        </Protected>
      </Route>
      <Route path="/requests">
        <Protected>
          <Requests />
        </Protected>
      </Route>
      <Route path="/browse">
        <Protected>
          <Browse />
        </Protected>
      </Route>
      <Route path="/offers">
        <Protected>
          <Offers />
        </Protected>
      </Route>
      <Route path="/providers/:id">
        <Protected>
          <ProviderPublic />
        </Protected>
      </Route>
      <Route path="/profile">
        <Protected>
          <Profile />
        </Protected>
      </Route>
      <Route path="/wallet">
        <Protected>
          <ProviderOnly>
            <Wallet />
          </ProviderOnly>
        </Protected>
      </Route>
      <Route path="/notifications">
        <Protected>
          <Notifications />
        </Protected>
      </Route>
      <Route path="/messages">
        <Protected>
          <Messages />
        </Protected>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}
