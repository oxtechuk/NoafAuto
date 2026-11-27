import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { CompareProvider } from '@/context/CompareContext'
import Home from '@/pages/Home'

// Home ships in the main bundle (first paint); every other page is its own chunk.
const Cars = lazy(() => import('@/pages/Cars'))
const CarDetails = lazy(() => import('@/pages/CarDetails'))
const Compare = lazy(() => import('@/pages/Compare'))
const Offers = lazy(() => import('@/pages/Offers'))
const Blog = lazy(() => import('@/pages/Blog'))
const Article = lazy(() => import('@/pages/Article'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const FinanceCalculator = lazy(() => import('@/pages/FinanceCalculator'))
const CustomRequest = lazy(() => import('@/pages/CustomRequest'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export default function App() {
  return (
    <CompareProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/:id" element={<CarDetails />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Article />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/finance/calculator" element={<FinanceCalculator />} />
          <Route path="/request-car" element={<CustomRequest />} />
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route path="/terms" element={<LegalPage slug="terms" />} />
          <Route path="/legal/:slug" element={<LegalPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </CompareProvider>
  )
}
