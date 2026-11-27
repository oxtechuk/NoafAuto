import { Route, Routes } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import { CompareProvider } from '@/context/CompareContext'
import Home from '@/pages/Home'
import Cars from '@/pages/Cars'
import CarDetails from '@/pages/CarDetails'
import Compare from '@/pages/Compare'
import Offers from '@/pages/Offers'
import Blog from '@/pages/Blog'
import Article from '@/pages/Article'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import FinanceCalculator from '@/pages/FinanceCalculator'
import CustomRequest from '@/pages/CustomRequest'
import LegalPage from '@/pages/LegalPage'
import NotFound from '@/pages/NotFound'

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
