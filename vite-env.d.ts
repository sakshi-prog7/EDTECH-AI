declare module '@tailwindcss/vite' {
  const tailwindcss: () => import('vite').Plugin
  export default tailwindcss
}

declare module '@vitejs/plugin-react' {
  const react: (options?: Record<string, unknown>) => import('vite').Plugin
  export default react
}
