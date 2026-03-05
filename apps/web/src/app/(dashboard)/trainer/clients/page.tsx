import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, ChevronRight } from 'lucide-react'

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
      <div>
        <h1 className="text-display">Clients</h1>
        <p className="text-body text-foreground-secondary mt-1">
          {clients.length} active client{clients.length !== 1 ? 's' : ''}
        </p>
      </div>

      {clients.length === 0 ? (
        <div className="empty-state">
          <div className="stat-card-icon">
            <Users className="w-5 h-5 text-foreground-secondary" />
          </div>
          <p className="text-subheading">No clients yet</p>
          <p className="text-caption max-w-xs">
            Clients will appear here once they have been linked to your account.
          </p>
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
                <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center text-lg font-semibold flex-shrink-0 border border-border">
                  {client.avatarUrl ? (
                    <img
                      src={client.avatarUrl}
                      alt={client.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-foreground-secondary">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground group-hover:text-accent transition-colors truncate">
                    {client.name}
                  </p>
                  {client.email && (
                    <p className="text-caption truncate">{client.email}</p>
                  )}
                </div>
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-foreground-secondary group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
