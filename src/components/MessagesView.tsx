import React, { useEffect, useState } from 'react';
import { Shield, Flag, Send } from 'lucide-react';
import type { Conversation, UserRole } from '../shared/types.ts';

interface MessagesViewProps {
  conversations: Conversation[];
  role: UserRole;
  adminName: string;
  onSendMessage: (convId: number, senderLabel: string, body: string) => Promise<void>;
  onFlagConversation: (convId: number) => Promise<void>;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  conversations,
  role,
  adminName,
  onSendMessage,
  onFlagConversation,
}) => {
  const [activeId, setActiveId] = useState<number | null>(conversations[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0] || null;
  const senderLabel = role === 'seller' ? 'Vendeur' : role === 'admin' ? adminName : 'Acheteur';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;
    setSending(true);
    try {
      await onSendMessage(activeConv.id, senderLabel, draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-700">
        <Shield className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        <span>
          <strong>Protection de la vie privée :</strong> les adresses e-mail, numéros de téléphone et liens externes sont masqués automatiquement côté serveur dans toutes les discussions.
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
        {/* Left: Conversation List */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 space-y-2 bg-slate-50/50">
          <div className="text-xs font-bold text-slate-500 px-2 pb-2">
            Discussions par commande ({conversations.length})
          </div>
          {conversations.length === 0 ? (
            <div className="text-xs text-slate-500 p-4">Aucune conversation active.</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white border-amber-500 shadow-sm'
                      : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {conv.store_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {conv.parcel_code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 truncate mt-1">{conv.product_title}</div>
                  {conv.flagged && (
                    <div className="text-[11px] font-semibold text-rose-700 mt-1">
                      Signalé à {adminName}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </aside>

        {/* Right: Active Thread */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          {!activeConv ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Sélectionnez une commande pour afficher la discussion sécurisée.
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {activeConv.store_name} — {activeConv.parcel_code}
                  </div>
                  <div className="text-xs text-slate-500">
                    {activeConv.product_title} · Connecté en tant que{' '}
                    <strong className="text-slate-700">{senderLabel}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={activeConv.flagged}
                  onClick={() => onFlagConversation(activeConv.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeConv.flagged
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 cursor-default'
                      : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{activeConv.flagged ? 'Signalé à Junior' : 'Signaler à Junior'}</span>
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-50/40 max-h-[380px]">
                {activeConv.messages.map((msg) => {
                  const isMe = msg.sender_label === senderLabel;
                  const isSystem = msg.sender_label === 'Système';
                  if (isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="text-center text-[11px] text-slate-500 py-1 px-4"
                      >
                        {msg.body}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm ${
                          isMe
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>{msg.body}</div>
                        <div
                          className={`text-[10px] mt-1 font-mono ${
                            isMe ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {msg.sender_label} ·{' '}
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
              >
                <input
                  type="text"
                  required
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Écrire un message sécurisé (téléphones/emails masqués automatiquement)..."
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Envoyer</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
