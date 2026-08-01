import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import { useI18n } from "./lib/i18n";

const Carte = lazy(() => import("./pages/Carte"));
const Wilayas = lazy(() => import("./pages/Wilayas"));
const Clusters = lazy(() => import("./pages/Clusters"));
const Reseau = lazy(() => import("./pages/Reseau"));
const Regles = lazy(() => import("./pages/Regles"));
const Methodologie = lazy(() => import("./pages/Methodologie"));
const Tendances = lazy(() => import("./pages/Tendances"));
const Strategies = lazy(() => import("./pages/Strategies"));
const Indicateurs = lazy(() => import("./pages/Indicateurs"));
const Rapport = lazy(() => import("./pages/Rapport"));
const Robustesse = lazy(() => import("./pages/Robustesse"));
const Parcours = lazy(() => import("./pages/Parcours"));
const Rendement = lazy(() => import("./pages/Rendement"));
const Modeles = lazy(() => import("./pages/Modeles"));
const Optimisation = lazy(() => import("./pages/Optimisation"));
const Acces = lazy(() => import("./pages/Acces"));
const Projection = lazy(() => import("./pages/Projection"));
const Explorer = lazy(() => import("./pages/Explorer"));

function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center py-32 text-sm text-slate-400">
      {t("app.loading")}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="/carte"
          element={
            <Suspense fallback={<Loading />}>
              <Carte />
            </Suspense>
          }
        />
        <Route
          path="/wilayas"
          element={
            <Suspense fallback={<Loading />}>
              <Wilayas />
            </Suspense>
          }
        />
        <Route
          path="/clusters"
          element={
            <Suspense fallback={<Loading />}>
              <Clusters />
            </Suspense>
          }
        />
        <Route
          path="/reseau"
          element={
            <Suspense fallback={<Loading />}>
              <Reseau />
            </Suspense>
          }
        />
        <Route
          path="/regles"
          element={
            <Suspense fallback={<Loading />}>
              <Regles />
            </Suspense>
          }
        />
        <Route
          path="/methodologie"
          element={
            <Suspense fallback={<Loading />}>
              <Methodologie />
            </Suspense>
          }
        />
        <Route
          path="/tendances"
          element={
            <Suspense fallback={<Loading />}>
              <Tendances />
            </Suspense>
          }
        />
        <Route
          path="/strategies"
          element={
            <Suspense fallback={<Loading />}>
              <Strategies />
            </Suspense>
          }
        />
        <Route
          path="/indicateurs"
          element={
            <Suspense fallback={<Loading />}>
              <Indicateurs />
            </Suspense>
          }
        />
        <Route
          path="/parcours"
          element={
            <Suspense fallback={<Loading />}>
              <Parcours />
            </Suspense>
          }
        />
        <Route
          path="/rendement"
          element={
            <Suspense fallback={<Loading />}>
              <Rendement />
            </Suspense>
          }
        />
        <Route
          path="/modeles"
          element={
            <Suspense fallback={<Loading />}>
              <Modeles />
            </Suspense>
          }
        />
        <Route
          path="/optimisation"
          element={
            <Suspense fallback={<Loading />}>
              <Optimisation />
            </Suspense>
          }
        />
        <Route
          path="/acces"
          element={
            <Suspense fallback={<Loading />}>
              <Acces />
            </Suspense>
          }
        />
        <Route
          path="/projection"
          element={
            <Suspense fallback={<Loading />}>
              <Projection />
            </Suspense>
          }
        />
        <Route
          path="/explorer"
          element={
            <Suspense fallback={<Loading />}>
              <Explorer />
            </Suspense>
          }
        />
        <Route
          path="/robustesse"
          element={
            <Suspense fallback={<Loading />}>
              <Robustesse />
            </Suspense>
          }
        />
        <Route
          path="/rapport"
          element={
            <Suspense fallback={<Loading />}>
              <Rapport />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
