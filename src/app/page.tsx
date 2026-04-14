import { redirect } from 'next/navigation'

export default function Home() {
  // Simple redirect to dashboard, middleware will handle auth check
  redirect('/dashboard')
}
