import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ruCommon from './locales/ru/common.json'
import enCommon from './locales/en/common.json'
import ruAuth from './locales/ru/auth.json'
import enAuth from './locales/en/auth.json'
import ruTracking from './locales/ru/tracking.json'
import enTracking from './locales/en/tracking.json'
import ruCustomers from './locales/ru/customers.json'
import enCustomers from './locales/en/customers.json'
import ruOrders from './locales/ru/orders.json'
import enOrders from './locales/en/orders.json'
import ruStatuses from './locales/ru/statuses.json'
import enStatuses from './locales/en/statuses.json'
import ruAdmins from './locales/ru/admins.json'
import enAdmins from './locales/en/admins.json'
import ruDashboard from './locales/ru/dashboard.json'
import enDashboard from './locales/en/dashboard.json'
import ruHelp from './locales/ru/help.json'
import enHelp from './locales/en/help.json'
import ruProducts from './locales/ru/products.json'
import enProducts from './locales/en/products.json'

function detectSystemLocale(): 'ru' | 'en' {
  const candidates = [...(navigator.languages ?? []), navigator.language]
  for (const lang of candidates) {
    if (lang?.toLowerCase().startsWith('ru')) {
      return 'ru'
    }
  }
  return 'en'
}

const savedLocale = localStorage.getItem('locale')
const defaultLocale =
  savedLocale === 'ru' || savedLocale === 'en' ? savedLocale : detectSystemLocale()

void i18n.use(initReactI18next).init({
  resources: {
    ru: {
      common: ruCommon,
      auth: ruAuth,
      tracking: ruTracking,
      customers: ruCustomers,
      orders: ruOrders,
      statuses: ruStatuses,
      dashboard: ruDashboard,
      admins: ruAdmins,
      help: ruHelp,
      products: ruProducts,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      tracking: enTracking,
      customers: enCustomers,
      orders: enOrders,
      statuses: enStatuses,
      dashboard: enDashboard,
      admins: enAdmins,
      help: enHelp,
      products: enProducts,
    },
  },
  lng: defaultLocale,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
})

document.documentElement.lang = defaultLocale

export default i18n
