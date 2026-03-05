import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TrainerClientsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get linked clients for this trainer
  const { data: links } = await supabase
    .from('trainer_clients')
    .select(`
      client_id,
      active,
      profiles!trainer_clients_client_id_fkey (
        id, full_name, email, avatar_url
      )
    `)
    .eq('trainer_id', user.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  const clients = links?.map((l: any) => ({
    id: l.client_id,
    name: l.profiles?.full_name ?? l.profiles?.email ?? 'Unknown',
    email: l.profiles?.email,
    avatarUrl: l.profiles?.avatar_url,
  })) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-display">Clients</h1>
      <p className="text-body text-foreground/60">{clients.length} active client{clients.length !== 1 ? 's' : ''}</p>

      {clients.length === 0 ? (
        <div className="card text-center py-16 text-foreground/50">
          <p className="text-heading mb-2">No clients yet</p>
          <p className="text-body">Clients will appear here once linked.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/trainer/clients/${client.id}`}
              className="card hover:border-accent transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-lg font-semibold flex-shrink-0">
                  {client.avatarUrl ? (
                    <img src={client.avatarUrl} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span>{client.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-label font-medium truncate group-hover:text-accent transition-colors">
                    {client.name}
                  </p>
                  {client.email && (
                    <p className="text-caption text-foreground/50 truncate">{client.email}</p>
                  )}
                </div>
                <svg className="ml-auto flex-shrink-0 w-4 h-4 text-foreground/30 group-hover:text-accent transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
