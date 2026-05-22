import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import SiteHeader from "./components/SiteHeader";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import UnitSelection from "./pages/UnitSelection";
import TrueOrFalseQuiz from "./pages/TrueOrFalseQuiz";
import PrintQuiz from "./pages/PrintQuiz";
import AdminQuestionFix from "./pages/AdminQuestionFix";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import TeacherResults from "./pages/TeacherResults";
import { ClassificationQuiz } from "./pages/ClassificationQuiz";
import { MatchingQuiz } from "./pages/MatchingQuiz";
import { OrderingQuiz } from "./pages/OrderingQuiz";
import { ChoiceQuiz } from "./pages/ChoiceQuiz";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/units"} component={UnitSelection} />
      <Route path={"/quiz/true-false"} component={TrueOrFalseQuiz} />
      <Route path={"/quiz/classification"} component={ClassificationQuiz} />
      <Route path={"/quiz/matching"} component={MatchingQuiz} />
      <Route path={"/quiz/ordering"} component={OrderingQuiz} />
      <Route path={"/quiz/choice"} component={ChoiceQuiz} />
      <Route path={"/quiz/print"} component={PrintQuiz} />
      <Route path={"/login"} component={Login} />
      <Route path={"/admin/fix-question"} component={AdminQuestionFix} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/teacher/results"} component={TeacherResults} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            <div className="flex-1">
              <Router />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
