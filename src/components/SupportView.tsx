import React, { useState } from 'react';
import { LifeBuoy, CheckCircle2 } from 'lucide-react';
import type { Order, SupportTicket, SupportTicketType } from '../shared/types.ts';

interface SupportViewProps {
  orders: Order[];
  tickets: SupportTicket[];
  onSubmitTicket: (payload: {
    parcelCode: string;
    ticketType: SupportTicketType;
    description: string;
  }) => Promise<SupportTicket>;
}

export const SupportView: React.FC<SupportViewProps> = ({
  orders,
  tickets,
  onSubmitTicket,
}) => {
  const [ticketType, setTicketType] = useState<SupportTicketType>('payout_hold');
  const [parcelCode, setParcelCode] = useState(orders[0]?.parcel_code || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [latestTicket, setLatestTicket] = useState<SupportTicket | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const created = await onSubmitTicket({
        parcelCode: parcelCode.trim(),
        ticketType,
        description: description.trim(),
      });
      setLatestTicket(created);
      setDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5 h-fit">
        <div className="flex items-start gap-3">
          <LifeBuoy className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Support Actif & Résolution Immédiate
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagnostic automatique sur les blocages séquestre, calculs de commission et numéros de suivi
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type de demande
            </label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value as SupportTicketType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="payout_hold">Paiement bloqué avant livraison</option>
              <option value="commission">Vérification calcul commission</option>
              <option value="tracking">Problème ou mise à jour numéro de suivi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Code colis concerné
            </label>
            <input
              type="text"
              list="parcel-codes-list"
              value={parcelCode}
              onChange={(e) => setParcelCode(e.target.value)}
              placeholder="Ex: CMD-84920-41"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <datalist id="parcel-codes-list">
              {orders.map((o) => (
                <option key={o.id} value={o.parcel_code}>
                  {o.product_title}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description ou nouveau numéro de suivi
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre question ou collez directement un nouveau code suivi (ex: DHL99201482)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            {submitting ? 'Analyse en cours...' : 'Analyser maintenant'}
          </button>
        </form>

        {latestTicket && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Réponse active ({latestTicket.parcel_code})</span>
            </div>
            <p className="leading-relaxed">{latestTicket.reply}</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Historique des résolutions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Journal complet des diagnostics et actions automatiques effectués sur la plateforme
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Aucun ticket enregistré pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {tickets.map((t) => (
              <div key={t.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-900">
                    #{t.id} · {t.parcel_code}
                  </span>
                  <span className="text-slate-500 font-mono tabular-nums">
                    {new Date(t.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-sm text-slate-700">{t.description}</div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 leading-relaxed">
                  {t.reply}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
