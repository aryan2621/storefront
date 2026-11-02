import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Success } from './pages/Success';
import { Account } from './pages/Account';
import { Terms } from './pages/legal/Terms';
import { Privacy } from './pages/legal/Privacy';
import { Refunds } from './pages/legal/Refunds';
import { Delivery } from './pages/legal/Delivery';
import { Contact } from './pages/legal/Contact';
import { Pricing } from './pages/legal/Pricing';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminSubscriptions } from './pages/admin/AdminSubscriptions';
import { AdminLicenses } from './pages/admin/AdminLicenses';
import { AdminEvents } from './pages/admin/AdminEvents';
import { AdminLookup } from './pages/admin/AdminLookup';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminAudit } from './pages/admin/AdminAudit';
import { NotFound } from './pages/NotFound';

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/products" element={<Products />} />
    <Route path="/p/:slug" element={<ProductDetail />} />
    <Route path="/success" element={<Success />} />
    <Route path="/account" element={<Account />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/refunds" element={<Refunds />} />
    <Route path="/delivery" element={<Delivery />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<AdminOverview />} />
      <Route path="payments" element={<AdminPayments />} />
      <Route path="customers" element={<AdminCustomers />} />
      <Route path="subscriptions" element={<AdminSubscriptions />} />
      <Route path="licenses" element={<AdminLicenses />} />
      <Route path="events" element={<AdminEvents />} />
      <Route path="lookup" element={<AdminLookup />} />
      <Route path="products" element={<AdminProducts />} />
      <Route path="analytics" element={<AdminAnalytics />} />
      <Route path="audit" element={<AdminAudit />} />
    </Route>
    <Route path="/404" element={<NotFound />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>
);
