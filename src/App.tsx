import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import AuthGate from "@/components/AuthGate";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import Contacts from "@/pages/Contacts";
import Messages from "@/pages/Messages";

import Instances from "@/pages/Instances";


import Flows from "@/pages/Flows";
import FlowEditor from "@/pages/FlowEditor";
import CreateTemplate from "@/pages/CreateTemplate";
import EditTemplate from "@/pages/EditTemplate";
import Help from "@/pages/Help";
import Conversations from "@/pages/Conversations";
import SendLogs from "@/pages/SendLogs";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthGate>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/conversas" element={<Conversations />} />
            
            <Route path="/messages" element={<Messages />} />
            
            <Route path="/instances" element={<Instances />} />
            
            <Route path="/flows" element={<Flows />} />
            <Route path="/flows/:id/edit" element={<FlowEditor />} />
            <Route path="/templates/create" element={<CreateTemplate />} />
            <Route path="/templates/:id/edit" element={<EditTemplate />} />
            
            <Route path="/registros" element={<SendLogs />} />
            <Route path="/help" element={<Help />} />
            
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
      </AuthGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
