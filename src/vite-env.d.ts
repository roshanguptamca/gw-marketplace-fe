/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: 'local' | 'production'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MAIN_FRONTEND_URL?: string
  readonly VITE_MARKETPLACE_URL?: string
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
